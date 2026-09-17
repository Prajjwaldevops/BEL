// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IdentityRegistry
 * @dev Manages Decentralized Identifiers (DIDs) on-chain
 */
contract IdentityRegistry is Ownable {
    enum IdentityStatus { ACTIVE, SUSPENDED, REVOKED }

    struct Identity {
        string did;
        address walletAddress;
        string publicKey;
        IdentityStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    mapping(address => Identity) private identities;
    mapping(string => address) private didToAddress;
    
    event IdentityRegistered(address indexed wallet, string did, string publicKey);
    event IdentityStatusChanged(address indexed wallet, IdentityStatus status);

    constructor() Ownable(msg.sender) {}

    function registerIdentity(address _wallet, string memory _did, string memory _publicKey) external onlyOwner {
        require(identities[_wallet].createdAt == 0, "Identity already exists for this wallet");
        require(didToAddress[_did] == address(0), "DID already registered");

        identities[_wallet] = Identity({
            did: _did,
            walletAddress: _wallet,
            publicKey: _publicKey,
            status: IdentityStatus.ACTIVE,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        didToAddress[_did] = _wallet;

        emit IdentityRegistered(_wallet, _did, _publicKey);
    }

    function updateIdentityStatus(address _wallet, IdentityStatus _status) external onlyOwner {
        require(identities[_wallet].createdAt != 0, "Identity does not exist");
        
        identities[_wallet].status = _status;
        identities[_wallet].updatedAt = block.timestamp;
        
        emit IdentityStatusChanged(_wallet, _status);
    }

    function getIdentity(address _wallet) external view returns (Identity memory) {
        require(identities[_wallet].createdAt != 0, "Identity does not exist");
        return identities[_wallet];
    }

    function isIdentityActive(address _wallet) external view returns (bool) {
        if (identities[_wallet].createdAt == 0) return false;
        return identities[_wallet].status == IdentityStatus.ACTIVE;
    }
}
