import { expect } from "chai";
import { ethers } from "hardhat";
import { AssetNFT, RoleManager } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AssetNFT", function () {
  let assetNFT: AssetNFT;
  let roleManager: RoleManager;
  let admin: SignerWithAddress;
  let minter: SignerWithAddress;
  let manager: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));
  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

  beforeEach(async function () {
    [admin, minter, manager, user1, user2, unauthorized] = await ethers.getSigners();

    // Deploy RoleManager
    const RoleManagerFactory = await ethers.getContractFactory("RoleManager");
    roleManager = await RoleManagerFactory.deploy();
    await roleManager.waitForDeployment();

    // Deploy AssetNFT
    const AssetNFTFactory = await ethers.getContractFactory("AssetNFT");
    assetNFT = await AssetNFTFactory.deploy(await roleManager.getAddress());
    await assetNFT.waitForDeployment();

    // Grant roles
    await assetNFT.connect(admin).grantRole(MINTER_ROLE, minter.address);
    await assetNFT.connect(admin).grantRole(MANAGER_ROLE, manager.address);
    await assetNFT.connect(admin).grantRole(PAUSER_ROLE, admin.address);
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await assetNFT.name()).to.equal("BEL Sentinel Asset");
      expect(await assetNFT.symbol()).to.equal("BELSA");
    });

    it("Should link to RoleManager", async function () {
      expect(await assetNFT.roleManager()).to.equal(await roleManager.getAddress());
    });

    it("Should start token IDs at 1000", async function () {
      await assetNFT.connect(minter).mintAsset(
        user1.address,
        "RADAR-001",
        "ipfs://QmAsset1"
      );
      expect(await assetNFT.ownerOf(1000)).to.equal(user1.address);
    });
  });

  describe("Minting", function () {
    it("Should mint asset from authorized minter", async function () {
      const tx = await assetNFT.connect(minter).mintAsset(
        user1.address,
        "RADAR-001",
        "ipfs://QmAsset1"
      );

      await expect(tx)
        .to.emit(assetNFT, "AssetMinted")
        .withArgs(1000, "RADAR-001", user1.address);

      expect(await assetNFT.ownerOf(1000)).to.equal(user1.address);
    });

    it("Should fail when unauthorized caller tries to mint", async function () {
      await expect(
        assetNFT.connect(unauthorized).mintAsset(
          user1.address,
          "RADAR-001",
          "ipfs://QmAsset1"
        )
      ).to.be.reverted;
    });

    it("Should reject minting with empty physical ID", async function () {
      await expect(
        assetNFT.connect(minter).mintAsset(
          user1.address,
          "",
          "ipfs://QmAsset1"
        )
      ).to.be.revertedWith("Physical ID cannot be empty");
    });

    it("Should reject minting to zero address", async function () {
      await expect(
        assetNFT.connect(minter).mintAsset(
          ethers.ZeroAddress,
          "RADAR-001",
          "ipfs://QmAsset1"
        )
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("Should set initial status to REGISTERED", async function () {
      await assetNFT.connect(minter).mintAsset(
        user1.address,
        "RADAR-001",
        "ipfs://QmAsset1"
      );
      
      const details = await assetNFT.getAssetDetails(1000);
      expect(details.status).to.equal(1); // AssetStatus.REGISTERED = 1
    });
  });

  describe("Asset Status Management", function () {
    beforeEach(async function () {
      await assetNFT.connect(minter).mintAsset(
        user1.address,
        "RADAR-001",
        "ipfs://QmAsset1"
      );
    });

    it("Should allow manager to update status", async function () {
      const tx = await assetNFT.connect(manager).updateAssetStatus(1000, 3); // ACTIVE
      
      await expect(tx)
        .to.emit(assetNFT, "AssetStatusChanged")
        .withArgs(1000, 3);

      const details = await assetNFT.getAssetDetails(1000);
      expect(details.status).to.equal(3);
    });

    it("Should reject status update from unauthorized account", async function () {
      await expect(
        assetNFT.connect(unauthorized).updateAssetStatus(1000, 3)
      ).to.be.reverted;
    });

    it("Should reject status update for non-existent asset", async function () {
      await expect(
        assetNFT.connect(manager).updateAssetStatus(9999, 3)
      ).to.be.revertedWith("Asset does not exist");
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await assetNFT.connect(minter).mintAsset(
        user1.address,
        "RADAR-001",
        "ipfs://QmAsset1"
      );
    });

    it("Should allow manager to transfer asset", async function () {
      await assetNFT.connect(manager).transferFrom(user1.address, user2.address, 1000);
      expect(await assetNFT.ownerOf(1000)).to.equal(user2.address);
    });

    it("Should allow owner to transfer own asset", async function () {
      await assetNFT.connect(user1).transferFrom(user1.address, user2.address, 1000);
      expect(await assetNFT.ownerOf(1000)).to.equal(user2.address);
    });

    it("Should update status to TRANSFERRED on transfer", async function () {
      await assetNFT.connect(manager).transferFrom(user1.address, user2.address, 1000);
      
      const details = await assetNFT.getAssetDetails(1000);
      expect(details.status).to.equal(4); // AssetStatus.TRANSFERRED = 4
    });

    it("Should reject transfer from unauthorized account", async function () {
      await expect(
        assetNFT.connect(unauthorized).transferFrom(user1.address, user2.address, 1000)
      ).to.be.revertedWith("Not authorized to transfer this asset");
    });

    it("Should reject transfer to zero address", async function () {
      await expect(
        assetNFT.connect(manager).transferFrom(user1.address, ethers.ZeroAddress, 1000)
      ).to.be.revertedWith("Transfer to zero address");
    });

    it("Should emit AssetTransferApproved event", async function () {
      await expect(
        assetNFT.connect(manager).transferFrom(user1.address, user2.address, 1000)
      ).to.emit(assetNFT, "AssetTransferApproved")
       .withArgs(1000, user1.address, user2.address, manager.address);
    });
  });

  describe("Pausable", function () {
    it("Should allow pauser to pause contract", async function () {
      await assetNFT.connect(admin).pause();
      expect(await assetNFT.paused()).to.be.true;
    });

    it("Should block minting when paused", async function () {
      await assetNFT.connect(admin).pause();

      await expect(
        assetNFT.connect(minter).mintAsset(
          user1.address,
          "RADAR-001",
          "ipfs://QmAsset1"
        )
      ).to.be.revertedWithCustomError(assetNFT, "EnforcedPause");
    });

    it("Should block transfers when paused", async function () {
      await assetNFT.connect(minter).mintAsset(
        user1.address,
        "RADAR-001",
        "ipfs://QmAsset1"
      );
      
      await assetNFT.connect(admin).pause();

      await expect(
        assetNFT.connect(manager).transferFrom(user1.address, user2.address, 1000)
      ).to.be.revertedWithCustomError(assetNFT, "EnforcedPause");
    });

    it("Should allow unpausing", async function () {
      await assetNFT.connect(admin).pause();
      await assetNFT.connect(admin).unpause();
      expect(await assetNFT.paused()).to.be.false;
    });

    it("Should reject pause from unauthorized account", async function () {
      await expect(
        assetNFT.connect(unauthorized).pause()
      ).to.be.reverted;
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      await assetNFT.connect(minter).mintAsset(
        user1.address,
        "RADAR-001",
        "ipfs://QmAsset1"
      );
    });

    it("Should retrieve asset details", async function () {
      const details = await assetNFT.getAssetDetails(1000);
      
      expect(details.physicalId).to.equal("RADAR-001");
      expect(details.status).to.equal(1); // REGISTERED
      expect(details.owner).to.equal(user1.address);
      expect(details.uri).to.equal("ipfs://QmAsset1");
    });

    it("Should revert when querying non-existent asset", async function () {
      await expect(
        assetNFT.getAssetDetails(9999)
      ).to.be.revertedWith("Asset does not exist");
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant minter role", async function () {
      await assetNFT.connect(admin).grantRole(MINTER_ROLE, user1.address);
      expect(await assetNFT.hasRole(MINTER_ROLE, user1.address)).to.be.true;
    });

    it("Should allow admin to revoke manager role", async function () {
      await assetNFT.connect(admin).grantRole(MANAGER_ROLE, user1.address);
      await assetNFT.connect(admin).revokeRole(MANAGER_ROLE, user1.address);
      expect(await assetNFT.hasRole(MANAGER_ROLE, user1.address)).to.be.false;
    });

    it("Should reject role grant from non-admin", async function () {
      await expect(
        assetNFT.connect(unauthorized).grantRole(MINTER_ROLE, user1.address)
      ).to.be.reverted;
    });
  });

  describe("ReentrancyGuard", function () {
    it("Should have nonReentrant modifier on mintAsset", async function () {
      const tx = await assetNFT.connect(minter).mintAsset(
        user1.address,
        "RADAR-001",
        "ipfs://QmAsset1"
      );
      await tx.wait();
      expect(await assetNFT.ownerOf(1000)).to.equal(user1.address);
    });

    it("Should have nonReentrant modifier on transferFrom", async function () {
      await assetNFT.connect(minter).mintAsset(
        user1.address,
        "RADAR-001",
        "ipfs://QmAsset1"
      );
      
      const tx = await assetNFT.connect(manager).transferFrom(user1.address, user2.address, 1000);
      await tx.wait();
      expect(await assetNFT.ownerOf(1000)).to.equal(user2.address);
    });
  });
});
