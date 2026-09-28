import { expect } from "chai";
import hre from "hardhat";
import { DocumentNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const ethers = hre.ethers;

describe("DocumentNFT", function () {
  let contract: DocumentNFT;
  let deployer: SignerWithAddress;
  let minter: SignerWithAddress;
  let revoker: SignerWithAddress;
  let userA: SignerWithAddress;
  let userB: SignerWithAddress;
  let unauthorised: SignerWithAddress;

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const REVOKER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REVOKER_ROLE"));
  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

  // Sample hashes (32 bytes)
  const contentHash = ethers.keccak256(ethers.toUtf8Bytes("document-content-v1"));
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("metadata-json-v1"));
  const tokenURI = "ipfs://QmSampleMetadataHash123/metadata.json";

  beforeEach(async function () {
    [deployer, minter, revoker, userA, userB, unauthorised] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DocumentNFT");
    contract = await Factory.deploy();
    await contract.waitForDeployment();

    // Grant roles
    await contract.grantRole(MINTER_ROLE, minter.address);
    await contract.grantRole(REVOKER_ROLE, revoker.address);
  });

  // =====================================================
  // DEPLOYMENT
  // =====================================================
  describe("Deployment", function () {
    it("should set name and symbol correctly", async function () {
      expect(await contract.name()).to.equal("BEL Document");
      expect(await contract.symbol()).to.equal("BELDOC");
    });

    it("should grant all roles to deployer", async function () {
      expect(await contract.hasRole(MINTER_ROLE, deployer.address)).to.be.true;
      expect(await contract.hasRole(REVOKER_ROLE, deployer.address)).to.be.true;
      expect(await contract.hasRole(PAUSER_ROLE, deployer.address)).to.be.true;
    });

    it("should start with zero minted documents", async function () {
      expect(await contract.totalMinted()).to.equal(0);
    });
  });

  // =====================================================
  // MINTING
  // =====================================================
  describe("Minting", function () {
    it("should mint a document NFT and assign to user", async function () {
      const tx = await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0
      );
      const receipt = await tx.wait();

      expect(await contract.ownerOf(1)).to.equal(userA.address);
      expect(await contract.tokenURI(1)).to.equal(tokenURI);
      expect(await contract.totalMinted()).to.equal(1);
    });

    it("should emit DocumentMinted event with correct parameters", async function () {
      await expect(
        contract.connect(minter).mintDocument(
          userA.address, tokenURI, contentHash, metadataHash, true, 0
        )
      ).to.emit(contract, "DocumentMinted")
        .withArgs(1, userA.address, minter.address, contentHash, metadataHash, true);
    });

    it("should store correct document record on-chain", async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, false, 0
      );

      const doc = await contract.getDocument(1);
      expect(doc.contentHash).to.equal(contentHash);
      expect(doc.metadataHash).to.equal(metadataHash);
      expect(doc.issuer).to.equal(minter.address);
      expect(doc.revoked).to.be.false;
      expect(doc.transferable).to.be.false;
      expect(doc.expiresAt).to.equal(0);
    });

    it("should register hashToTokenId mapping", async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0
      );
      expect(await contract.hashToTokenId(contentHash)).to.equal(1);
    });

    it("should reject minting the same content hash twice", async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0
      );
      await expect(
        contract.connect(minter).mintDocument(
          userB.address, "ipfs://other", contentHash, metadataHash, true, 0
        )
      ).to.be.revertedWith("Document with this hash already minted");
    });

    it("should reject zero-address recipient", async function () {
      await expect(
        contract.connect(minter).mintDocument(
          ethers.ZeroAddress, tokenURI, contentHash, metadataHash, true, 0
        )
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("should reject empty content hash", async function () {
      await expect(
        contract.connect(minter).mintDocument(
          userA.address, tokenURI, ethers.ZeroHash, metadataHash, true, 0
        )
      ).to.be.revertedWith("Content hash cannot be zero");
    });

    it("should reject empty metadata hash", async function () {
      await expect(
        contract.connect(minter).mintDocument(
          userA.address, tokenURI, contentHash, ethers.ZeroHash, true, 0
        )
      ).to.be.revertedWith("Metadata hash cannot be zero");
    });

    it("should reject empty token URI", async function () {
      await expect(
        contract.connect(minter).mintDocument(
          userA.address, "", contentHash, metadataHash, true, 0
        )
      ).to.be.revertedWith("Token URI cannot be empty");
    });

    it("should reject minting by unauthorized caller", async function () {
      await expect(
        contract.connect(unauthorised).mintDocument(
          userA.address, tokenURI, contentHash, metadataHash, true, 0
        )
      ).to.be.reverted;
    });

    it("should assign incremental token IDs starting at 1", async function () {
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("document-content-v2"));
      const meta2 = ethers.keccak256(ethers.toUtf8Bytes("metadata-v2"));

      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0
      );
      await contract.connect(minter).mintDocument(
        userB.address, "ipfs://second", hash2, meta2, true, 0
      );

      expect(await contract.ownerOf(1)).to.equal(userA.address);
      expect(await contract.ownerOf(2)).to.equal(userB.address);
    });
  });

  // =====================================================
  // REVOCATION
  // =====================================================
  describe("Revocation", function () {
    beforeEach(async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0
      );
    });

    it("should revoke a document", async function () {
      await contract.connect(revoker).revokeDocument(1, "Policy violation");
      const doc = await contract.getDocument(1);
      expect(doc.revoked).to.be.true;
    });

    it("should emit DocumentRevoked event", async function () {
      await expect(
        contract.connect(revoker).revokeDocument(1, "Compromised")
      ).to.emit(contract, "DocumentRevoked")
        .withArgs(1, revoker.address, "Compromised");
    });

    it("should reject double revocation", async function () {
      await contract.connect(revoker).revokeDocument(1, "First revoke");
      await expect(
        contract.connect(revoker).revokeDocument(1, "Second revoke")
      ).to.be.revertedWith("Document already revoked");
    });

    it("should reject revocation by unauthorized caller", async function () {
      await expect(
        contract.connect(unauthorised).revokeDocument(1, "Reason")
      ).to.be.reverted;
    });

    it("should reject revocation of non-existent token", async function () {
      await expect(
        contract.connect(revoker).revokeDocument(999, "Reason")
      ).to.be.revertedWith("Document does not exist");
    });

    it("should prevent transfer of revoked document", async function () {
      await contract.connect(revoker).revokeDocument(1, "Compromised");
      await expect(
        contract.connect(userA).transferFrom(userA.address, userB.address, 1)
      ).to.be.revertedWith("Cannot transfer revoked document");
    });
  });

  // =====================================================
  // EXPIRY
  // =====================================================
  describe("Expiry", function () {
    it("should consider document valid when expiresAt = 0 (no expiry)", async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0
      );
      expect(await contract.isDocumentValid(1)).to.be.true;
    });

    it("should consider document valid when expiresAt is in the future", async function () {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // +1 hour
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, futureTimestamp
      );
      expect(await contract.isDocumentValid(1)).to.be.true;
    });

    it("should consider document expired when expiresAt is in the past", async function () {
      const pastTimestamp = 1; // 1 second after epoch — definitely in the past
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, pastTimestamp
      );
      expect(await contract.isDocumentValid(1)).to.be.false;
    });

    it("should consider revoked document as invalid regardless of expiry", async function () {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, futureTimestamp
      );
      await contract.connect(revoker).revokeDocument(1, "Revoked");
      expect(await contract.isDocumentValid(1)).to.be.false;
    });
  });

  // =====================================================
  // VERIFICATION
  // =====================================================
  describe("Verification", function () {
    beforeEach(async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0
      );
    });

    it("should verify matching content hash", async function () {
      const [valid, documentValid] = await contract.verifyDocument(1, contentHash);
      expect(valid).to.be.true;
      expect(documentValid).to.be.true;
    });

    it("should reject non-matching content hash", async function () {
      const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("tampered-content"));
      const [valid, documentValid] = await contract.verifyDocument(1, wrongHash);
      expect(valid).to.be.false;
      expect(documentValid).to.be.true;
    });

    it("should return valid=true but documentValid=false for revoked document", async function () {
      await contract.connect(revoker).revokeDocument(1, "Revoked");
      const [valid, documentValid] = await contract.verifyDocument(1, contentHash);
      expect(valid).to.be.true; // Hash still matches
      expect(documentValid).to.be.false; // But document is revoked
    });

    it("should look up token by content hash", async function () {
      expect(await contract.getTokenByHash(contentHash)).to.equal(1);
    });

    it("should revert when looking up non-existent hash", async function () {
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      await expect(
        contract.getTokenByHash(unknownHash)
      ).to.be.revertedWith("No document found for this hash");
    });
  });

  // =====================================================
  // TRANSFER (Soulbound vs Transferable)
  // =====================================================
  describe("Transfer", function () {
    it("should allow transfer of transferable document", async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0 // transferable = true
      );
      await contract.connect(userA).transferFrom(userA.address, userB.address, 1);
      expect(await contract.ownerOf(1)).to.equal(userB.address);
    });

    it("should emit DocumentTransferred event on transfer", async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0
      );
      await expect(
        contract.connect(userA).transferFrom(userA.address, userB.address, 1)
      ).to.emit(contract, "DocumentTransferred")
        .withArgs(1, userA.address, userB.address);
    });

    it("should reject transfer of soulbound (non-transferable) document", async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, false, 0 // transferable = false
      );
      await expect(
        contract.connect(userA).transferFrom(userA.address, userB.address, 1)
      ).to.be.revertedWith("Document is soulbound and non-transferable");
    });

    it("should allow safeTransferFrom for transferable document", async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0
      );
      await contract.connect(userA)["safeTransferFrom(address,address,uint256)"](
        userA.address, userB.address, 1
      );
      expect(await contract.ownerOf(1)).to.equal(userB.address);
    });
  });

  // =====================================================
  // PAUSE / UNPAUSE
  // =====================================================
  describe("Pause", function () {
    it("should pause the contract", async function () {
      await contract.connect(deployer).pause();
      await expect(
        contract.connect(minter).mintDocument(
          userA.address, tokenURI, contentHash, metadataHash, true, 0
        )
      ).to.be.reverted;
    });

    it("should unpause the contract", async function () {
      await contract.connect(deployer).pause();
      await contract.connect(deployer).unpause();
      await expect(
        contract.connect(minter).mintDocument(
          userA.address, tokenURI, contentHash, metadataHash, true, 0
        )
      ).to.not.be.reverted;
    });

    it("should reject pause by unauthorized caller", async function () {
      await expect(
        contract.connect(unauthorised).pause()
      ).to.be.reverted;
    });
  });

  // =====================================================
  // GETTERS
  // =====================================================
  describe("Getters", function () {
    beforeEach(async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0
      );
    });

    it("should return owner and URI via getDocumentOwnerAndURI", async function () {
      const [owner, uri] = await contract.getDocumentOwnerAndURI(1);
      expect(owner).to.equal(userA.address);
      expect(uri).to.equal(tokenURI);
    });

    it("should revert on getDocument for non-existent token", async function () {
      await expect(contract.getDocument(999)).to.be.revertedWith("Document does not exist");
    });

    it("should revert on getDocumentOwnerAndURI for non-existent token", async function () {
      await expect(contract.getDocumentOwnerAndURI(999)).to.be.revertedWith("Document does not exist");
    });

    it("should revert on isDocumentValid for non-existent token", async function () {
      await expect(contract.isDocumentValid(999)).to.be.revertedWith("Document does not exist");
    });
  });

  // =====================================================
  // ACCESS CONTROL
  // =====================================================
  describe("Access Control", function () {
    it("should support ERC-165 interface detection", async function () {
      // ERC-721 interface ID
      const ERC721_INTERFACE = "0x80ac58cd";
      expect(await contract.supportsInterface(ERC721_INTERFACE)).to.be.true;
    });

    it("should support AccessControl interface", async function () {
      // AccessControl interface ID
      const ACCESS_CONTROL_INTERFACE = "0x7965db0b";
      expect(await contract.supportsInterface(ACCESS_CONTROL_INTERFACE)).to.be.true;
    });

    it("admin should be able to grant and revoke roles", async function () {
      await contract.grantRole(MINTER_ROLE, unauthorised.address);
      expect(await contract.hasRole(MINTER_ROLE, unauthorised.address)).to.be.true;

      await contract.revokeRole(MINTER_ROLE, unauthorised.address);
      expect(await contract.hasRole(MINTER_ROLE, unauthorised.address)).to.be.false;
    });
  });

  // =====================================================
  // UPDATE DOCUMENT
  // =====================================================
  describe("Update Document", function () {
    const newMetadataHash = ethers.keccak256(ethers.toUtf8Bytes("updated-metadata-v2"));
    const newTokenURI = "ipfs://QmUpdatedMetadata/metadata.json";

    beforeEach(async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0
      );
    });

    it("should update metadata hash and token URI", async function () {
      await contract.connect(minter).updateDocument(1, newMetadataHash, newTokenURI);
      const doc = await contract.getDocument(1);
      expect(doc.metadataHash).to.equal(newMetadataHash);
      expect(await contract.tokenURI(1)).to.equal(newTokenURI);
    });

    it("should emit DocumentUpdated event", async function () {
      await expect(
        contract.connect(minter).updateDocument(1, newMetadataHash, newTokenURI)
      ).to.emit(contract, "DocumentUpdated")
        .withArgs(1, newMetadataHash, newTokenURI);
    });

    it("should reject update on revoked document", async function () {
      await contract.connect(revoker).revokeDocument(1, "Revoked");
      await expect(
        contract.connect(minter).updateDocument(1, newMetadataHash, newTokenURI)
      ).to.be.revertedWith("Cannot update revoked document");
    });

    it("should reject update by unauthorized caller", async function () {
      await expect(
        contract.connect(unauthorised).updateDocument(1, newMetadataHash, newTokenURI)
      ).to.be.reverted;
    });

    it("should reject update with zero metadata hash", async function () {
      await expect(
        contract.connect(minter).updateDocument(1, ethers.ZeroHash, newTokenURI)
      ).to.be.revertedWith("Metadata hash cannot be zero");
    });

    it("should reject update with empty token URI", async function () {
      await expect(
        contract.connect(minter).updateDocument(1, newMetadataHash, "")
      ).to.be.revertedWith("Token URI cannot be empty");
    });
  });

  // =====================================================
  // SUPERSESSION (VERSIONING)
  // =====================================================
  describe("Supersession", function () {
    const contentHashV2 = ethers.keccak256(ethers.toUtf8Bytes("document-content-v2"));
    const metadataHashV2 = ethers.keccak256(ethers.toUtf8Bytes("metadata-json-v2"));
    const tokenURIV2 = "ipfs://QmV2Metadata/metadata.json";

    beforeEach(async function () {
      await contract.connect(minter).mintDocument(
        userA.address, tokenURI, contentHash, metadataHash, true, 0
      );
    });

    it("should supersede a document and mint new version", async function () {
      await contract.connect(minter).supersedeDocument(
        1, userA.address, tokenURIV2, contentHashV2, metadataHashV2, true, 0
      );

      // New token exists
      expect(await contract.ownerOf(2)).to.equal(userA.address);
      // Old token still exists
      expect(await contract.ownerOf(1)).to.equal(userA.address);
      // Supersession chain
      expect(await contract.supersededBy(1)).to.equal(2);
    });

    it("should emit DocumentSuperseded event", async function () {
      await expect(
        contract.connect(minter).supersedeDocument(
          1, userA.address, tokenURIV2, contentHashV2, metadataHashV2, true, 0
        )
      ).to.emit(contract, "DocumentSuperseded")
        .withArgs(1, 2);
    });

    it("should also emit DocumentMinted for the new version", async function () {
      await expect(
        contract.connect(minter).supersedeDocument(
          1, userA.address, tokenURIV2, contentHashV2, metadataHashV2, true, 0
        )
      ).to.emit(contract, "DocumentMinted");
    });

    it("should reject superseding a non-existent document", async function () {
      await expect(
        contract.connect(minter).supersedeDocument(
          999, userA.address, tokenURIV2, contentHashV2, metadataHashV2, true, 0
        )
      ).to.be.revertedWith("Original document does not exist");
    });

    it("should reject superseding a revoked document", async function () {
      await contract.connect(revoker).revokeDocument(1, "Revoked");
      await expect(
        contract.connect(minter).supersedeDocument(
          1, userA.address, tokenURIV2, contentHashV2, metadataHashV2, true, 0
        )
      ).to.be.revertedWith("Cannot supersede revoked document");
    });

    it("should reject double supersession", async function () {
      await contract.connect(minter).supersedeDocument(
        1, userA.address, tokenURIV2, contentHashV2, metadataHashV2, true, 0
      );
      const contentHashV3 = ethers.keccak256(ethers.toUtf8Bytes("document-content-v3"));
      const metadataHashV3 = ethers.keccak256(ethers.toUtf8Bytes("metadata-json-v3"));
      await expect(
        contract.connect(minter).supersedeDocument(
          1, userA.address, "ipfs://v3", contentHashV3, metadataHashV3, true, 0
        )
      ).to.be.revertedWith("Document already superseded");
    });

    it("should allow chaining supersessions (v2 superseded by v3)", async function () {
      // v1 → v2
      await contract.connect(minter).supersedeDocument(
        1, userA.address, tokenURIV2, contentHashV2, metadataHashV2, true, 0
      );
      // v2 → v3
      const contentHashV3 = ethers.keccak256(ethers.toUtf8Bytes("document-content-v3"));
      const metadataHashV3 = ethers.keccak256(ethers.toUtf8Bytes("metadata-json-v3"));
      await contract.connect(minter).supersedeDocument(
        2, userA.address, "ipfs://v3", contentHashV3, metadataHashV3, true, 0
      );

      expect(await contract.supersededBy(1)).to.equal(2);
      expect(await contract.supersededBy(2)).to.equal(3);
      expect(await contract.totalMinted()).to.equal(3);
    });
  });
});
