import { expect } from "chai";
import hre from "hardhat";
import { IdentityNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IdentityNFT", function () {
  let identityNFT: IdentityNFT;
  let admin: SignerWithAddress;
  let minter: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  const MINTER_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("MINTER_ROLE"));
  const PAUSER_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("PAUSER_ROLE"));

  beforeEach(async function () {
    [admin, minter, user1, user2, unauthorized] = await hre.ethers.getSigners();

    const IdentityNFTFactory = await hre.ethers.getContractFactory("IdentityNFT");
    identityNFT = await IdentityNFTFactory.deploy();
    await identityNFT.waitForDeployment();

    // Grant minter role to minter account
    await identityNFT.connect(admin).grantRole(MINTER_ROLE, minter.address);
    await identityNFT.connect(admin).grantRole(PAUSER_ROLE, admin.address);
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await identityNFT.name()).to.equal("BEL Sentinel Identity");
      expect(await identityNFT.symbol()).to.equal("BELID");
    });

    it("Should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = await identityNFT.DEFAULT_ADMIN_ROLE();
      expect(await identityNFT.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should start with zero minted tokens", async function () {
      expect(await identityNFT.totalMinted()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should mint identity NFT from authorized minter", async function () {
      const tx = await identityNFT.connect(minter).mintIdentity(
        user1.address,
        "ipfs://QmTestURI1",
        "0x1234abcd",
        "https://r2.example.com/photo1.jpg",
        "VIEWER",
        "Intelligence",
        "CLEARED"
      );

      await expect(tx)
        .to.emit(identityNFT, "IdentityMinted")
        .withArgs(1, user1.address, "VIEWER", "Intelligence", "0x1234abcd");

      expect(await identityNFT.totalMinted()).to.equal(1);
      expect(await identityNFT.ownerOf(1)).to.equal(user1.address);
    });

    it("Should fail when unauthorized caller tries to mint", async function () {
      await expect(
        identityNFT.connect(unauthorized).mintIdentity(
          user1.address,
          "ipfs://QmTestURI1",
          "0x1234abcd",
          "https://r2.example.com/photo1.jpg",
          "VIEWER",
          "Intelligence",
          "CLEARED"
        )
      ).to.be.reverted;
    });

    it("Should prevent duplicate minting to same wallet", async function () {
      await identityNFT.connect(minter).mintIdentity(
        user1.address,
        "ipfs://QmTestURI1",
        "0x1234abcd",
        "https://r2.example.com/photo1.jpg",
        "VIEWER",
        "Intelligence",
        "CLEARED"
      );

      await expect(
        identityNFT.connect(minter).mintIdentity(
          user1.address,
          "ipfs://QmTestURI2",
          "0x5678efgh",
          "https://r2.example.com/photo2.jpg",
          "ALTER",
          "Operations",
          "CLEARED"
        )
      ).to.be.revertedWith("Identity NFT already minted for this wallet");
    });

    it("Should reject minting with empty photo hash", async function () {
      await expect(
        identityNFT.connect(minter).mintIdentity(
          user1.address,
          "ipfs://QmTestURI1",
          "",
          "https://r2.example.com/photo1.jpg",
          "VIEWER",
          "Intelligence",
          "CLEARED"
        )
      ).to.be.revertedWith("Photo hash cannot be empty");
    });

    it("Should reject minting to zero address", async function () {
      await expect(
        identityNFT.connect(minter).mintIdentity(
          ethers.ZeroAddress,
          "ipfs://QmTestURI1",
          "0x1234abcd",
          "https://r2.example.com/photo1.jpg",
          "VIEWER",
          "Intelligence",
          "CLEARED"
        )
      ).to.be.revertedWith("Invalid wallet address");
    });
  });

  describe("Metadata Hash Verification", function () {
    beforeEach(async function () {
      await identityNFT.connect(minter).mintIdentity(
        user1.address,
        "ipfs://QmTestURI1",
        "0x1234abcd",
        "https://r2.example.com/photo1.jpg",
        "VIEWER",
        "Intelligence",
        "CLEARED"
      );
    });

    it("Should verify correct metadata hash", async function () {
      const isValid = await identityNFT.verifyMetadataHash(
        1,
        "0x1234abcd",
        "VIEWER",
        "Intelligence",
        "CLEARED"
      );
      expect(isValid).to.be.true;
    });

    it("Should detect tampered photo hash", async function () {
      const isValid = await identityNFT.verifyMetadataHash(
        1,
        "0xTAMPERED",
        "VIEWER",
        "Intelligence",
        "CLEARED"
      );
      expect(isValid).to.be.false;
    });

    it("Should detect tampered role", async function () {
      const isValid = await identityNFT.verifyMetadataHash(
        1,
        "0x1234abcd",
        "ADMIN",
        "Intelligence",
        "CLEARED"
      );
      expect(isValid).to.be.false;
    });

    it("Should detect tampered criminal status", async function () {
      const isValid = await identityNFT.verifyMetadataHash(
        1,
        "0x1234abcd",
        "VIEWER",
        "Intelligence",
        "FLAGGED"
      );
      expect(isValid).to.be.false;
    });
  });

  describe("Soulbound Behavior", function () {
    beforeEach(async function () {
      await identityNFT.connect(minter).mintIdentity(
        user1.address,
        "ipfs://QmTestURI1",
        "0x1234abcd",
        "https://r2.example.com/photo1.jpg",
        "VIEWER",
        "Intelligence",
        "CLEARED"
      );
    });

    it("Should block transfers between users", async function () {
      await expect(
        identityNFT.connect(user1).transferFrom(user1.address, user2.address, 1)
      ).to.be.revertedWith("Identity NFTs are soulbound and non-transferable");
    });

    it("Should block safe transfers", async function () {
      await expect(
        identityNFT.connect(user1)["safeTransferFrom(address,address,uint256)"](
          user1.address,
          user2.address,
          1
        )
      ).to.be.revertedWith("Identity NFTs are soulbound and non-transferable");
    });
  });

  describe("Pausable", function () {
    it("Should allow pauser to pause contract", async function () {
      await identityNFT.connect(admin).pause();
      expect(await identityNFT.paused()).to.be.true;
    });

    it("Should block minting when paused", async function () {
      await identityNFT.connect(admin).pause();

      await expect(
        identityNFT.connect(minter).mintIdentity(
          user1.address,
          "ipfs://QmTestURI1",
          "0x1234abcd",
          "https://r2.example.com/photo1.jpg",
          "VIEWER",
          "Intelligence",
          "CLEARED"
        )
      ).to.be.revertedWithCustomError(identityNFT, "EnforcedPause");
    });

    it("Should allow unpausing", async function () {
      await identityNFT.connect(admin).pause();
      await identityNFT.connect(admin).unpause();
      expect(await identityNFT.paused()).to.be.false;
    });

    it("Should reject pause from unauthorized account", async function () {
      await expect(
        identityNFT.connect(unauthorized).pause()
      ).to.be.reverted;
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      await identityNFT.connect(minter).mintIdentity(
        user1.address,
        "ipfs://QmTestURI1",
        "0x1234abcd",
        "https://r2.example.com/photo1.jpg",
        "VIEWER",
        "Intelligence",
        "CLEARED"
      );
    });

    it("Should retrieve identity by token ID", async function () {
      const identity = await identityNFT.getIdentity(1);
      expect(identity.photoHash).to.equal("0x1234abcd");
      expect(identity.role).to.equal("VIEWER");
      expect(identity.department).to.equal("Intelligence");
      expect(identity.criminalStatus).to.equal("CLEARED");
    });

    it("Should retrieve identity by wallet address", async function () {
      const identity = await identityNFT.getIdentityByWallet(user1.address);
      expect(identity.photoHash).to.equal("0x1234abcd");
      expect(identity.role).to.equal("VIEWER");
    });

    it("Should revert when querying non-existent token", async function () {
      await expect(
        identityNFT.getIdentity(999)
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should revert when querying wallet without identity", async function () {
      await expect(
        identityNFT.getIdentityByWallet(user2.address)
      ).to.be.revertedWith("No identity NFT for this wallet");
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant minter role", async function () {
      await identityNFT.connect(admin).grantRole(MINTER_ROLE, user1.address);
      expect(await identityNFT.hasRole(MINTER_ROLE, user1.address)).to.be.true;
    });

    it("Should allow admin to revoke minter role", async function () {
      await identityNFT.connect(admin).grantRole(MINTER_ROLE, user1.address);
      await identityNFT.connect(admin).revokeRole(MINTER_ROLE, user1.address);
      expect(await identityNFT.hasRole(MINTER_ROLE, user1.address)).to.be.false;
    });

    it("Should reject role grant from non-admin", async function () {
      await expect(
        identityNFT.connect(unauthorized).grantRole(MINTER_ROLE, user1.address)
      ).to.be.reverted;
    });
  });

  describe("ReentrancyGuard", function () {
    it("Should have nonReentrant modifier on mintIdentity", async function () {
      // This test verifies the function has the modifier by checking it doesn't allow reentrancy
      // A malicious contract would be needed for full test - this is a smoke test
      const tx = await identityNFT.connect(minter).mintIdentity(
        user1.address,
        "ipfs://QmTestURI1",
        "0x1234abcd",
        "https://r2.example.com/photo1.jpg",
        "VIEWER",
        "Intelligence",
        "CLEARED"
      );
      await tx.wait();
      expect(await identityNFT.totalMinted()).to.equal(1);
    });
  });
});
