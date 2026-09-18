// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./RoleManager.sol";

/**
 * @title AuditRegistry
 * @dev Immutable on-chain audit log for critical system events.
 *      Now supports batched Merkle root anchoring for gas efficiency.
 *      Individual events can be verified against anchored roots.
 *      
 *      Security hardening:
 *      - AccessControl for role-based permissions
 *      - ReentrancyGuard on state-changing functions
 *      - Pausable for emergency stops
 *      
 *      Roles:
 *      - DEFAULT_ADMIN_ROLE: Full admin capabilities
 *      - AUDITOR_ROLE: Can record audit logs and batch roots
 */
contract AuditRegistry is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    RoleManager public roleManager;

    uint256 public constant ACTION_GAS_FEE = 0.00001 ether; // 10000000000000 wei

    struct AuditLog {
        uint256 id;
        address actor;
        string action;         // VIEW, MODIFY, ACCESS, LOGIN, REGISTER, etc.
        string resourceId;
        string detailsHash;    // IPFS CID or SHA256 hash of full details
        uint256 gasFee;        // Gas fee charged for this action
        uint256 timestamp;
    }

    struct BatchAnchor {
        uint256 id;
        bytes32 merkleRoot;    // Root hash of Merkle tree
        uint256 eventCount;    // Number of events in batch
        uint256 timestamp;
        address anchoredBy;
    }

    uint256 private nextLogId = 1;
    uint256 private nextBatchId = 1;
    
    mapping(uint256 => AuditLog) public auditLogs;
    mapping(uint256 => BatchAnchor) public batchAnchors;
    mapping(bytes32 => bool) public anchoredRoots; // For quick root lookup
    
    uint256 public totalGasFeesCollected;

    event LogRecorded(uint256 indexed id, address indexed actor, string action, string resourceId, uint256 gasFee);
    event GasFeeCollected(address indexed actor, uint256 amount);
    event BatchAnchored(uint256 indexed batchId, bytes32 indexed merkleRoot, uint256 eventCount, address indexed anchoredBy);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);

    constructor(address _roleManager) {
        require(_roleManager != address(0), "Invalid RoleManager address");
        roleManager = RoleManager(_roleManager);
        
        // Grant deployer all roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev Check if caller is authorized (has AUDITOR_ROLE or admin role via RoleManager).
     */
    modifier onlyAuthorized() {
        require(
            hasRole(AUDITOR_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
            roleManager.hasRole(msg.sender, roleManager.ROLE_ADMIN()) ||
            roleManager.hasRole(msg.sender, roleManager.ROLE_DEBUGGER()),
            "Not authorized to record audit logs"
        );
        _;
    }

    /**
     * @dev Record a Merkle root for a batch of audit events (NEW - BATCHED APPROACH)
     *      This is now the PRIMARY method for audit anchoring.
     *      Gas cost: ~0.0001 ETH per batch (vs 0.00001 ETH per event = 100x savings for 100 events)
     */
    function recordBatchRoot(
        bytes32 _merkleRoot,
        uint256 _eventCount
    ) external onlyAuthorized nonReentrant whenNotPaused returns (uint256) {
        require(_merkleRoot != bytes32(0), "Invalid Merkle root");
        require(_eventCount > 0, "Event count must be positive");
        require(!anchoredRoots[_merkleRoot], "Root already anchored");

        uint256 batchId = nextBatchId++;

        batchAnchors[batchId] = BatchAnchor({
            id: batchId,
            merkleRoot: _merkleRoot,
            eventCount: _eventCount,
            timestamp: block.timestamp,
            anchoredBy: msg.sender
        });

        anchoredRoots[_merkleRoot] = true;

        emit BatchAnchored(batchId, _merkleRoot, _eventCount, msg.sender);

        return batchId;
    }

    /**
     * @dev Verify a Merkle proof against an anchored root
     *      External verification that an event is included in an anchored batch
     */
    function verifyEventInBatch(
        bytes32 _merkleRoot,
        bytes32 _leaf,
        bytes32[] calldata _proof,
        uint256 _leafIndex
    ) external view returns (bool) {
        require(anchoredRoots[_merkleRoot], "Root not anchored");
        
        bytes32 computedHash = _leaf;
        uint256 index = _leafIndex;

        for (uint256 i = 0; i < _proof.length; i++) {
            bytes32 proofElement = _proof[i];

            if (index % 2 == 0) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }

            index = index / 2;
        }

        return computedHash == _merkleRoot;
    }

    /**
     * @dev Get batch anchor details
     */
    function getBatchAnchor(uint256 _batchId) external view returns (BatchAnchor memory) {
        require(_batchId > 0 && _batchId < nextBatchId, "Batch does not exist");
        return batchAnchors[_batchId];
    }

    /**
     * @dev Get total number of anchored batches
     */
    function getBatchCount() external view returns (uint256) {
        return nextBatchId - 1;
    }

    /**
     * @dev Check if a Merkle root has been anchored
     */
    function isRootAnchored(bytes32 _merkleRoot) external view returns (bool) {
        return anchoredRoots[_merkleRoot];
    }

    // ============================================================
    // LEGACY METHODS (kept for backwards compatibility)
    // Use recordBatchRoot for new implementations
    // ============================================================

    /**
     * @dev Record an audit log entry. Requires ACTION_GAS_FEE to be sent.
     *      LEGACY: Use recordBatchRoot for better gas efficiency
     */
    function recordLog(
        string memory _action,
        string memory _resourceId,
        string memory _detailsHash
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        require(msg.value >= ACTION_GAS_FEE, "Insufficient gas fee for audit action");
        require(bytes(_action).length > 0, "Action cannot be empty");

        uint256 logId = nextLogId++;

        auditLogs[logId] = AuditLog({
            id: logId,
            actor: msg.sender,
            action: _action,
            resourceId: _resourceId,
            detailsHash: _detailsHash,
            gasFee: msg.value,
            timestamp: block.timestamp
        });

        totalGasFeesCollected += msg.value;

        emit LogRecorded(logId, msg.sender, _action, _resourceId, msg.value);
        emit GasFeeCollected(msg.sender, msg.value);

        return logId;
    }

    /**
     * @dev Record an audit log WITHOUT gas fee (admin-only, for system events).
     *      LEGACY: Use recordBatchRoot for better gas efficiency
     */
    function recordSystemLog(
        string memory _action,
        string memory _resourceId,
        string memory _detailsHash
    ) external onlyAuthorized nonReentrant whenNotPaused returns (uint256) {
        require(bytes(_action).length > 0, "Action cannot be empty");
        
        uint256 logId = nextLogId++;

        auditLogs[logId] = AuditLog({
            id: logId,
            actor: msg.sender,
            action: _action,
            resourceId: _resourceId,
            detailsHash: _detailsHash,
            gasFee: 0,
            timestamp: block.timestamp
        });

        emit LogRecorded(logId, msg.sender, _action, _resourceId, 0);
        return logId;
    }

    function getLog(uint256 _id) external view returns (AuditLog memory) {
        require(_id > 0 && _id < nextLogId, "Log does not exist");
        return auditLogs[_id];
    }

    function getLogCount() external view returns (uint256) {
        return nextLogId - 1;
    }

    /**
     * @dev Withdraw collected gas fees to admin wallet.
     */
    function withdrawFees() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Fee withdrawal failed");
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
}
