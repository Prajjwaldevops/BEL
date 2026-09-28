// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DocumentNFT
 * @dev ERC-721 NFT representing document ownership and integrity.
 *
 *      Each token stores:
 *        - Document content hash (SHA-256)
 *        - Metadata hash
 *        - Issuer address
 *        - Timestamps
 *        - Revocation state
 *        - Transferability flag
 *
 *      Security:
 *        - AccessControl for role-based permissions
 *        - ReentrancyGuard on all state-changing functions
 *        - Pausable for emergency stops
 *        - Soulbound support (non-transferable documents)
 *        - Zero-address checks
 *
 *      Roles:
 *        - DEFAULT_ADMIN_ROLE: Full admin capabilities
 *        - MINTER_ROLE: Can mint new document NFTs
 *        - REVOKER_ROLE: Can revoke documents
 */
contract DocumentNFT is ERC721URIStorage, AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 private _nextTokenId;

    struct DocumentRecord {
        bytes32 contentHash;      // SHA-256 of original document bytes
        bytes32 metadataHash;     // SHA-256 of NFT metadata JSON
        address issuer;           // Address that initiated minting
        uint64 issuedAt;          // Timestamp of minting
        uint64 expiresAt;         // Optional expiry (0 = no expiry)
        bool revoked;             // Revocation state
        bool transferable;        // If false, token is soulbound
    }

    // Token ID => Document record
    mapping(uint256 => DocumentRecord) public documents;
    // Content hash => Token ID (for deduplication and lookup)
    mapping(bytes32 => uint256) public hashToTokenId;

    // ===== Events =====
    event DocumentMinted(
        uint256 indexed tokenId,
        address indexed owner,
        address indexed issuer,
        bytes32 contentHash,
        bytes32 metadataHash,
        bool transferable
    );

    event DocumentRevoked(
        uint256 indexed tokenId,
        address indexed revokedBy,
        string reason
    );

    event DocumentTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );

    event DocumentUpdated(
        uint256 indexed tokenId,
        bytes32 newMetadataHash,
        string newTokenURI
    );

    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);

    constructor() ERC721("BEL Document", "BELDOC") {
        _nextTokenId = 1; // Token IDs start at 1

        // Grant deployer all roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(REVOKER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev Mint a new document NFT.
     * @param to Recipient wallet (document owner)
     * @param _tokenURI Metadata URI
     * @param _contentHash SHA-256 of original document bytes
     * @param _metadataHash SHA-256 of metadata JSON
     * @param _transferable Whether the token can be transferred
     * @param _expiresAt Optional expiry timestamp (0 = no expiry)
     */
    function mintDocument(
        address to,
        string memory _tokenURI,
        bytes32 _contentHash,
        bytes32 _metadataHash,
        bool _transferable,
        uint64 _expiresAt
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused returns (uint256) {
        require(to != address(0), "Invalid recipient address");
        require(_contentHash != bytes32(0), "Content hash cannot be zero");
        require(_metadataHash != bytes32(0), "Metadata hash cannot be zero");
        require(bytes(_tokenURI).length > 0, "Token URI cannot be empty");
        require(hashToTokenId[_contentHash] == 0, "Document with this hash already minted");

        uint256 tokenId = _nextTokenId++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        documents[tokenId] = DocumentRecord({
            contentHash: _contentHash,
            metadataHash: _metadataHash,
            issuer: msg.sender,
            issuedAt: uint64(block.timestamp),
            expiresAt: _expiresAt,
            revoked: false,
            transferable: _transferable
        });

        hashToTokenId[_contentHash] = tokenId;

        emit DocumentMinted(tokenId, to, msg.sender, _contentHash, _metadataHash, _transferable);

        return tokenId;
    }

    /**
     * @dev Revoke a document NFT. Cannot be undone.
     * @param tokenId The token to revoke
     * @param reason Human-readable revocation reason
     */
    function revokeDocument(
        uint256 tokenId,
        string memory reason
    ) external onlyRole(REVOKER_ROLE) nonReentrant whenNotPaused {
        require(_ownerOf(tokenId) != address(0), "Document does not exist");
        require(!documents[tokenId].revoked, "Document already revoked");

        documents[tokenId].revoked = true;

        emit DocumentRevoked(tokenId, msg.sender, reason);
    }

    /**
     * @dev Check if a document is currently valid (not revoked and not expired).
     */
    function isDocumentValid(uint256 tokenId) public view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Document does not exist");

        DocumentRecord memory doc = documents[tokenId];

        if (doc.revoked) return false;
        if (doc.expiresAt > 0 && block.timestamp > doc.expiresAt) return false;

        return true;
    }

    /**
     * @dev Verify a content hash matches a minted document.
     * @param tokenId The token to verify against
     * @param _contentHash The hash to verify
     * @return valid Whether the hash matches
     * @return documentValid Whether the document is active
     */
    function verifyDocument(
        uint256 tokenId,
        bytes32 _contentHash
    ) external view returns (bool valid, bool documentValid) {
        require(_ownerOf(tokenId) != address(0), "Document does not exist");

        valid = documents[tokenId].contentHash == _contentHash;
        documentValid = isDocumentValid(tokenId);
    }

    /**
     * @dev Look up a token ID by content hash.
     */
    function getTokenByHash(bytes32 _contentHash) external view returns (uint256) {
        uint256 tokenId = hashToTokenId[_contentHash];
        require(tokenId != 0, "No document found for this hash");
        return tokenId;
    }

    /**
     * @dev Get document record for a token.
     */
    function getDocument(uint256 tokenId) external view returns (DocumentRecord memory) {
        require(_ownerOf(tokenId) != address(0), "Document does not exist");
        return documents[tokenId];
    }

    /**
     * @dev Get document owner and URI.
     */
    function getDocumentOwnerAndURI(uint256 tokenId) external view returns (
        address owner,
        string memory uri
    ) {
        require(_ownerOf(tokenId) != address(0), "Document does not exist");
        return (_ownerOf(tokenId), tokenURI(tokenId));
    }

    /**
     * @dev Get total number of minted documents.
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ===== Transfer Controls =====

    /**
     * @dev Override transfer to enforce soulbound and revocation checks.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0))
        if (from != address(0) && to != address(0)) {
            // This is a transfer, not a mint or burn
            require(!documents[tokenId].revoked, "Cannot transfer revoked document");
            require(documents[tokenId].transferable, "Document is soulbound and non-transferable");

            emit DocumentTransferred(tokenId, from, to);
        }

        return super._update(to, tokenId, auth);
    }

    // ===== Admin Functions =====

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
        emit ContractPaused(msg.sender);
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    /**
     * @dev Override supportsInterface for AccessControl + ERC721.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
