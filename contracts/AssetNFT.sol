// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./RoleManager.sol";

/**
 * @title AssetNFT
 * @dev Represents physical/digital assets as NFTs for provenance and traceability.
 *      
 *      Security hardening:
 *      - AccessControl for granular role-based permissions
 *      - ReentrancyGuard on all state-changing functions
 *      - Pausable for emergency stops
 *      - Explicit authorization checks before transfers
 *      
 *      Roles:
 *      - DEFAULT_ADMIN_ROLE: Full admin capabilities
 *      - MINTER_ROLE: Can mint new asset NFTs
 *      - MANAGER_ROLE: Can update asset status and approve transfers
 */
contract AssetNFT is ERC721URIStorage, AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    uint256 private _nextTokenId;
    RoleManager public roleManager;
    
    // Status enum matching the backend
    enum AssetStatus { CREATED, REGISTERED, ASSIGNED, ACTIVE, TRANSFERRED, MAINTENANCE, AUDITED, REVOKED, DECOMMISSIONED }
    
    mapping(uint256 => AssetStatus) public assetStatuses;
    mapping(uint256 => string) public assetPhysicalIds; // The real-world ID like 'RADAR-001'

    event AssetMinted(uint256 indexed tokenId, string physicalId, address indexed to);
    event AssetStatusChanged(uint256 indexed tokenId, AssetStatus status);
    event AssetTransferApproved(uint256 indexed tokenId, address indexed from, address indexed to, address approver);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);

    constructor(address _roleManager) ERC721("BEL Sentinel Asset", "BELSA") {
        require(_roleManager != address(0), "Invalid RoleManager address");
        roleManager = RoleManager(_roleManager);
        _nextTokenId = 1000; // Start token IDs at 1000 for visual distinction
        
        // Grant deployer all roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev Mint a new asset NFT.
     *      Only callable by accounts with MINTER_ROLE.
     */
    function mintAsset(
        address to,
        string memory physicalId,
        string memory tokenURI
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused returns (uint256) {
        require(to != address(0), "Invalid recipient address");
        require(bytes(physicalId).length > 0, "Physical ID cannot be empty");
        require(bytes(tokenURI).length > 0, "Token URI cannot be empty");
        
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        assetStatuses[tokenId] = AssetStatus.REGISTERED;
        assetPhysicalIds[tokenId] = physicalId;

        emit AssetMinted(tokenId, physicalId, to);
        return tokenId;
    }

    /**
     * @dev Update asset status.
     *      Only callable by accounts with MANAGER_ROLE.
     */
    function updateAssetStatus(uint256 tokenId, AssetStatus status) 
        external 
        onlyRole(MANAGER_ROLE) 
        nonReentrant 
        whenNotPaused 
    {
        require(_ownerOf(tokenId) != address(0), "Asset does not exist");
        assetStatuses[tokenId] = status;
        emit AssetStatusChanged(tokenId, status);
    }
    
    /**
     * @dev Override transfer to enforce role checks.
     *      Transfer requires:
     *      - Caller has MANAGER_ROLE OR ADMIN role via RoleManager, OR
     *      - Caller is the token owner
     */
    function transferFrom(address from, address to, uint256 tokenId) 
        public 
        virtual 
        override(ERC721, IERC721) 
        nonReentrant 
        whenNotPaused 
    {
        require(to != address(0), "Transfer to zero address");
        
        // Check authorization
        bool isAuthorized = 
            hasRole(MANAGER_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
            roleManager.hasRole(msg.sender, roleManager.ROLE_ADMIN()) ||
            roleManager.hasRole(msg.sender, roleManager.ROLE_MANAGER()) ||
            msg.sender == _ownerOf(tokenId) ||
            _isAuthorized(_ownerOf(tokenId), msg.sender, tokenId);
        
        require(isAuthorized, "Not authorized to transfer this asset");
        
        super.transferFrom(from, to, tokenId);
        assetStatuses[tokenId] = AssetStatus.TRANSFERRED;
        
        emit AssetStatusChanged(tokenId, AssetStatus.TRANSFERRED);
        emit AssetTransferApproved(tokenId, from, to, msg.sender);
    }

    /**
     * @dev Safe transfer with same authorization checks.
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
        public
        virtual
        override(ERC721, IERC721)
        nonReentrant
        whenNotPaused
    {
        transferFrom(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "Transfer to non ERC721Receiver");
    }

    /**
     * @dev Pause contract (emergency stop).
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
        emit ContractPaused(msg.sender);
    }

    /**
     * @dev Unpause contract.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    /**
     * @dev Get asset details.
     */
    function getAssetDetails(uint256 tokenId) external view returns (
        string memory physicalId,
        AssetStatus status,
        address owner,
        string memory uri
    ) {
        require(_ownerOf(tokenId) != address(0), "Asset does not exist");
        return (
            assetPhysicalIds[tokenId],
            assetStatuses[tokenId],
            _ownerOf(tokenId),
            tokenURI(tokenId)
        );
    }

    /**
     * @dev Override supportsInterface to include AccessControl.
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
