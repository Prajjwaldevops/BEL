// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RoleManager.sol";

/**
 * @title AssetNFT
 * @dev Represents physical/digital assets as NFTs for provenance and traceability
 */
contract AssetNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    RoleManager public roleManager;
    
    // Status enum matching the backend
    enum AssetStatus { CREATED, REGISTERED, ASSIGNED, ACTIVE, TRANSFERRED, MAINTENANCE, AUDITED, REVOKED, DECOMMISSIONED }
    
    mapping(uint256 => AssetStatus) public assetStatuses;
    mapping(uint256 => string) public assetPhysicalIds; // The real-world ID like 'RADAR-001'

    event AssetMinted(uint256 indexed tokenId, string physicalId, address indexed to);
    event AssetStatusChanged(uint256 indexed tokenId, AssetStatus status);

    constructor(address _roleManager) ERC721("BEL Sentinel Asset", "BELSA") Ownable(msg.sender) {
        roleManager = RoleManager(_roleManager);
        _nextTokenId = 1000; // Start token IDs at 1000 for visual distinction
    }

    modifier onlyManagerOrAdmin() {
        require(
            roleManager.hasRole(msg.sender, roleManager.ROLE_ADMIN()) || 
            roleManager.hasRole(msg.sender, roleManager.ROLE_MANAGER()),
            "Caller is not a manager or admin"
        );
        _;
    }

    function mintAsset(address to, string memory physicalId, string memory tokenURI) external onlyManagerOrAdmin returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        assetStatuses[tokenId] = AssetStatus.REGISTERED;
        assetPhysicalIds[tokenId] = physicalId;

        emit AssetMinted(tokenId, physicalId, to);
        return tokenId;
    }

    function updateAssetStatus(uint256 tokenId, AssetStatus status) external onlyManagerOrAdmin {
        require(ownerOf(tokenId) != address(0), "Asset does not exist");
        assetStatuses[tokenId] = status;
        emit AssetStatusChanged(tokenId, status);
    }
    
    // Override transfer to only allow authorized roles or the owner
    function transferFrom(address from, address to, uint256 tokenId) public virtual override(ERC721, IERC721) {
        // Enforce role checks in addition to standard ERC721 checks
        require(
            roleManager.hasRole(msg.sender, roleManager.ROLE_ADMIN()) ||
            roleManager.hasRole(msg.sender, roleManager.ROLE_MANAGER()) ||
            msg.sender == ownerOf(tokenId),
            "Not authorized to transfer"
        );
        super.transferFrom(from, to, tokenId);
        assetStatuses[tokenId] = AssetStatus.TRANSFERRED;
        emit AssetStatusChanged(tokenId, AssetStatus.TRANSFERRED);
    }
}
