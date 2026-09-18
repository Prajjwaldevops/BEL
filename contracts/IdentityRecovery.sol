// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IdentityNFT.sol";

/**
 * @title IdentityRecovery
 * @dev Guardian-based identity recovery system with M-of-N approval
 */
contract IdentityRecovery is AccessControl, ReentrancyGuard {
    bytes32 public constant RECOVERY_EXECUTOR_ROLE = keccak256("RECOVERY_EXECUTOR_ROLE");
    
    IdentityNFT public identityNFT;
    
    struct RecoveryRequest {
        address oldWallet;
        address newWallet;
        uint256 tokenId;
        uint256 requiredApprovals;
        uint256 approvalCount;
        uint256 rejectionCount;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 timelockExpires;
        bool executed;
        bool cancelled;
    }
    
    // Recovery request ID => RecoveryRequest
    mapping(bytes32 => RecoveryRequest) public recoveryRequests;
    
    // Recovery request ID => guardian address => has approved
    mapping(bytes32 => mapping(address => bool)) public hasApproved;
    
    // Recovery request ID => guardian address => has rejected
    mapping(bytes32 => mapping(address => bool)) public hasRejected;
    
    // Token ID => array of guardian addresses
    mapping(uint256 => address[]) public guardians;
    
    // Token ID => guardian address => is guardian
    mapping(uint256 => mapping(address => bool)) public isGuardian;
    
    // Configuration
    uint256 public constant MIN_GUARDIANS = 2;
    uint256 public constant MAX_GUARDIANS = 10;
    uint256 public constant DEFAULT_EXPIRY_DURATION = 7 days;
    uint256 public constant TIMELOCK_DURATION = 2 days;
    
    event GuardianAdded(uint256 indexed tokenId, address indexed guardian, address indexed addedBy);
    event GuardianRemoved(uint256 indexed tokenId, address indexed guardian, address indexed removedBy);
    event RecoveryRequested(
        bytes32 indexed requestId,
        uint256 indexed tokenId,
        address indexed oldWallet,
        address newWallet,
        uint256 requiredApprovals
    );
    event RecoveryApproved(bytes32 indexed requestId, address indexed guardian);
    event RecoveryRejected(bytes32 indexed requestId, address indexed guardian);
    event RecoveryExecuted(
        bytes32 indexed requestId,
        uint256 indexed tokenId,
        address indexed oldWallet,
        address newWallet
    );
    event RecoveryCancelled(bytes32 indexed requestId, address indexed cancelledBy);
    
    constructor(address _identityNFT) {
        identityNFT = IdentityNFT(_identityNFT);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RECOVERY_EXECUTOR_ROLE, msg.sender);
    }
    
    /**
     * @dev Add a guardian for a token
     */
    function addGuardian(uint256 tokenId, address guardian) external {
        require(guardian != address(0), "Invalid guardian address");
        require(!isGuardian[tokenId][guardian], "Already a guardian");
        require(guardians[tokenId].length < MAX_GUARDIANS, "Max guardians reached");
        
        // Only token owner or admin can add guardians
        address owner = identityNFT.ownerOf(tokenId);
        require(
            msg.sender == owner || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        guardians[tokenId].push(guardian);
        isGuardian[tokenId][guardian] = true;
        
        emit GuardianAdded(tokenId, guardian, msg.sender);
    }
    
    /**
     * @dev Remove a guardian
     */
    function removeGuardian(uint256 tokenId, address guardian) external {
        require(isGuardian[tokenId][guardian], "Not a guardian");
        
        // Only token owner or admin can remove guardians
        address owner = identityNFT.ownerOf(tokenId);
        require(
            msg.sender == owner || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        // Remove from mapping
        isGuardian[tokenId][guardian] = false;
        
        // Remove from array
        address[] storage guardianList = guardians[tokenId];
        for (uint256 i = 0; i < guardianList.length; i++) {
            if (guardianList[i] == guardian) {
                guardianList[i] = guardianList[guardianList.length - 1];
                guardianList.pop();
                break;
            }
        }
        
        emit GuardianRemoved(tokenId, guardian, msg.sender);
    }
    
    /**
     * @dev Initiate a recovery request
     */
    function initiateRecovery(
        uint256 tokenId,
        address newWallet,
        uint256 requiredApprovals
    ) external onlyRole(RECOVERY_EXECUTOR_ROLE) returns (bytes32) {
        require(newWallet != address(0), "Invalid new wallet");
        address oldWallet = identityNFT.ownerOf(tokenId);
        require(newWallet != oldWallet, "New wallet same as old");
        
        uint256 guardianCount = guardians[tokenId].length;
        require(guardianCount >= MIN_GUARDIANS, "Insufficient guardians");
        require(requiredApprovals > 0 && requiredApprovals <= guardianCount, "Invalid approval count");
        
        bytes32 requestId = keccak256(
            abi.encodePacked(tokenId, oldWallet, newWallet, block.timestamp)
        );
        require(recoveryRequests[requestId].createdAt == 0, "Request already exists");
        
        recoveryRequests[requestId] = RecoveryRequest({
            oldWallet: oldWallet,
            newWallet: newWallet,
            tokenId: tokenId,
            requiredApprovals: requiredApprovals,
            approvalCount: 0,
            rejectionCount: 0,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + DEFAULT_EXPIRY_DURATION,
            timelockExpires: 0,
            executed: false,
            cancelled: false
        });
        
        emit RecoveryRequested(requestId, tokenId, oldWallet, newWallet, requiredApprovals);
        
        return requestId;
    }
    
    /**
     * @dev Guardian approves a recovery request
     */
    function approveRecovery(bytes32 requestId) external nonReentrant {
        RecoveryRequest storage request = recoveryRequests[requestId];
        require(request.createdAt > 0, "Request does not exist");
        require(!request.executed, "Already executed");
        require(!request.cancelled, "Request cancelled");
        require(block.timestamp < request.expiresAt, "Request expired");
        
        require(isGuardian[request.tokenId][msg.sender], "Not a guardian");
        require(!hasApproved[requestId][msg.sender], "Already approved");
        require(!hasRejected[requestId][msg.sender], "Already rejected");
        
        hasApproved[requestId][msg.sender] = true;
        request.approvalCount++;
        
        emit RecoveryApproved(requestId, msg.sender);
        
        // If threshold reached, start timelock
        if (request.approvalCount >= request.requiredApprovals && request.timelockExpires == 0) {
            request.timelockExpires = block.timestamp + TIMELOCK_DURATION;
        }
    }
    
    /**
     * @dev Guardian rejects a recovery request
     */
    function rejectRecovery(bytes32 requestId) external nonReentrant {
        RecoveryRequest storage request = recoveryRequests[requestId];
        require(request.createdAt > 0, "Request does not exist");
        require(!request.executed, "Already executed");
        require(!request.cancelled, "Request cancelled");
        require(block.timestamp < request.expiresAt, "Request expired");
        
        require(isGuardian[request.tokenId][msg.sender], "Not a guardian");
        require(!hasApproved[requestId][msg.sender], "Already approved");
        require(!hasRejected[requestId][msg.sender], "Already rejected");
        
        hasRejected[requestId][msg.sender] = true;
        request.rejectionCount++;
        
        emit RecoveryRejected(requestId, msg.sender);
        
        // Auto-cancel if too many rejections
        uint256 guardianCount = guardians[request.tokenId].length;
        uint256 maxPossibleApprovals = guardianCount - request.rejectionCount;
        if (maxPossibleApprovals < request.requiredApprovals) {
            request.cancelled = true;
            emit RecoveryCancelled(requestId, msg.sender);
        }
    }
    
    /**
     * @dev Execute an approved recovery after timelock
     */
    function executeRecovery(bytes32 requestId) external onlyRole(RECOVERY_EXECUTOR_ROLE) nonReentrant {
        RecoveryRequest storage request = recoveryRequests[requestId];
        require(request.createdAt > 0, "Request does not exist");
        require(!request.executed, "Already executed");
        require(!request.cancelled, "Request cancelled");
        require(block.timestamp < request.expiresAt, "Request expired");
        require(request.approvalCount >= request.requiredApprovals, "Insufficient approvals");
        require(request.timelockExpires > 0, "Timelock not started");
        require(block.timestamp >= request.timelockExpires, "Timelock not expired");
        
        request.executed = true;
        
        // Transfer NFT to new wallet
        // Note: This requires the IdentityNFT contract to grant approval to this contract
        // or implement a special recovery transfer function
        identityNFT.safeTransferFrom(request.oldWallet, request.newWallet, request.tokenId);
        
        emit RecoveryExecuted(requestId, request.tokenId, request.oldWallet, request.newWallet);
    }
    
    /**
     * @dev Cancel a recovery request (by token owner or admin)
     */
    function cancelRecovery(bytes32 requestId) external {
        RecoveryRequest storage request = recoveryRequests[requestId];
        require(request.createdAt > 0, "Request does not exist");
        require(!request.executed, "Already executed");
        require(!request.cancelled, "Already cancelled");
        
        address owner = identityNFT.ownerOf(request.tokenId);
        require(
            msg.sender == owner || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        request.cancelled = true;
        
        emit RecoveryCancelled(requestId, msg.sender);
    }
    
    /**
     * @dev Get guardians for a token
     */
    function getGuardians(uint256 tokenId) external view returns (address[] memory) {
        return guardians[tokenId];
    }
    
    /**
     * @dev Get guardian count for a token
     */
    function getGuardianCount(uint256 tokenId) external view returns (uint256) {
        return guardians[tokenId].length;
    }
    
    /**
     * @dev Check if address is a guardian for token
     */
    function checkIsGuardian(uint256 tokenId, address guardian) external view returns (bool) {
        return isGuardian[tokenId][guardian];
    }
    
    /**
     * @dev Get recovery request details
     */
    function getRecoveryRequest(bytes32 requestId) external view returns (
        address oldWallet,
        address newWallet,
        uint256 tokenId,
        uint256 requiredApprovals,
        uint256 approvalCount,
        uint256 rejectionCount,
        uint256 createdAt,
        uint256 expiresAt,
        uint256 timelockExpires,
        bool executed,
        bool cancelled
    ) {
        RecoveryRequest memory request = recoveryRequests[requestId];
        return (
            request.oldWallet,
            request.newWallet,
            request.tokenId,
            request.requiredApprovals,
            request.approvalCount,
            request.rejectionCount,
            request.createdAt,
            request.expiresAt,
            request.timelockExpires,
            request.executed,
            request.cancelled
        );
    }
}
