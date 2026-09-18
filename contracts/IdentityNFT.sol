// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title IdentityNFT
 * @dev Mints unique NFTs for registered users as verifiable identity tokens.
 *      Each NFT stores:
 *        - Webcam photo hash (stored on Cloudflare R2)
 *        - User metadata URI (name, department, role, criminal check status)
 *      
 *      Security hardening:
 *      - AccessControl for role-based permissions (replaces single owner)
 *      - ReentrancyGuard to prevent reentrancy attacks
 *      - Pausable for emergency stops
 *      - Explicit role checks on all state-changing functions
 *      
 *      Roles:
 *      - DEFAULT_ADMIN_ROLE: Can grant/revoke roles, pause contract
 *      - MINTER_ROLE: Can mint identity NFTs (typically backend wallet)
 */
contract IdentityNFT is ERC721URIStorage, AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    uint256 private _nextTokenId;

    struct UserIdentity {
        string photoHash;        // SHA-256 hash of webcam photo
        string photoUrl;         // Cloudflare R2 URL
        string role;             // VIEWER, ALTER, DEBUGGER
        string department;
        string criminalStatus;   // CLEARED / FLAGGED
        uint256 registeredAt;
    }

    mapping(uint256 => UserIdentity) public userIdentities;
    mapping(address => uint256) public walletToTokenId;
    mapping(address => bool) public hasMintedIdentity;

    event IdentityMinted(
        uint256 indexed tokenId,
        address indexed wallet,
        string role,
        string department,
        string photoHash
    );
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);

    constructor() ERC721("BEL Sentinel Identity", "BELID") {
        _nextTokenId = 1; // Token IDs start at 1
        
        // Grant deployer all roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev Mint an identity NFT for a newly registered user.
     *      Can only be called by accounts with MINTER_ROLE.
     *      Protected against reentrancy.
     */
    function mintIdentity(
        address _wallet,
        string memory _tokenURI,
        string memory _photoHash,
        string memory _photoUrl,
        string memory _role,
        string memory _department,
        string memory _criminalStatus
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused returns (uint256) {
        require(_wallet != address(0), "Invalid wallet address");
        require(bytes(_tokenURI).length > 0, "Token URI cannot be empty");
        require(bytes(_photoHash).length > 0, "Photo hash cannot be empty");
        require(!hasMintedIdentity[_wallet], "Identity NFT already minted for this wallet");

        uint256 tokenId = _nextTokenId++;

        _safeMint(_wallet, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        userIdentities[tokenId] = UserIdentity({
            photoHash: _photoHash,
            photoUrl: _photoUrl,
            role: _role,
            department: _department,
            criminalStatus: _criminalStatus,
            registeredAt: block.timestamp
        });

        walletToTokenId[_wallet] = tokenId;
        hasMintedIdentity[_wallet] = true;

        emit IdentityMinted(tokenId, _wallet, _role, _department, _photoHash);

        return tokenId;
    }

    /**
     * @dev Get the identity data for a given token ID.
     */
    function getIdentity(uint256 _tokenId) external view returns (UserIdentity memory) {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        return userIdentities[_tokenId];
    }

    /**
     * @dev Get the identity data by wallet address.
     */
    function getIdentityByWallet(address _wallet) external view returns (UserIdentity memory) {
        require(hasMintedIdentity[_wallet], "No identity NFT for this wallet");
        return userIdentities[walletToTokenId[_wallet]];
    }

    /**
     * @dev Get total number of minted identity NFTs.
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @dev Pause contract (emergency stop).
     *      Only callable by PAUSER_ROLE.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
        emit ContractPaused(msg.sender);
    }

    /**
     * @dev Unpause contract.
     *      Only callable by PAUSER_ROLE.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    /**
     * @dev Identity NFTs are soulbound — cannot be transferred.
     *      Overrides to block transfers while allowing minting.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0))
        // Block all other transfers
        if (from != address(0) && to != address(0)) {
            revert("Identity NFTs are soulbound and non-transferable");
        }
        
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override supportsInterface to include AccessControl
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
