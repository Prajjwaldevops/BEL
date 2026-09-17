// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IdentityNFT
 * @dev Mints unique NFTs for registered users as verifiable identity tokens.
 *      Each NFT stores:
 *        - Webcam photo hash (stored on Cloudflare R2)
 *        - User metadata URI (name, department, role, criminal check status)
 *      Only ADMIN (contract owner) can mint identity NFTs.
 */
contract IdentityNFT is ERC721URIStorage, Ownable {
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

    constructor() ERC721("BEL Sentinel Identity", "BELID") Ownable(msg.sender) {
        _nextTokenId = 1; // Token IDs start at 1
    }

    /**
     * @dev Mint an identity NFT for a newly registered user.
     *      Can only be called by the admin (owner).
     */
    function mintIdentity(
        address _wallet,
        string memory _tokenURI,
        string memory _photoHash,
        string memory _photoUrl,
        string memory _role,
        string memory _department,
        string memory _criminalStatus
    ) external onlyOwner returns (uint256) {
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
        require(ownerOf(_tokenId) != address(0), "Token does not exist");
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
     * @dev Identity NFTs are soulbound — cannot be transferred.
     */
    function transferFrom(address, address, uint256) public pure override(ERC721, IERC721) {
        revert("Identity NFTs are soulbound and non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override(ERC721, IERC721) {
        revert("Identity NFTs are soulbound and non-transferable");
    }
}
