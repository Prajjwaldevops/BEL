// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./RoleManager.sol";

/**
 * @title AuditRegistry
 * @dev Immutable on-chain audit log for critical system events.
 *      Every user action (view, change, access) incurs a gas fee
 *      of 0.00001 ETH which is logged in the audit entry.
 */
contract AuditRegistry is Ownable {
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

    uint256 private nextLogId = 1;
    mapping(uint256 => AuditLog) public auditLogs;
    uint256 public totalGasFeesCollected;

    event LogRecorded(uint256 indexed id, address indexed actor, string action, string resourceId, uint256 gasFee);
    event GasFeeCollected(address indexed actor, uint256 amount);

    constructor(address _roleManager) Ownable(msg.sender) {
        roleManager = RoleManager(_roleManager);
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner() ||
            roleManager.hasRole(msg.sender, roleManager.ROLE_ADMIN()) ||
            roleManager.hasRole(msg.sender, roleManager.ROLE_DEBUGGER()),
            "Not authorized to record audit logs"
        );
        _;
    }

    /**
     * @dev Record an audit log entry. Requires ACTION_GAS_FEE to be sent.
     *      The fee is stored in the log and added to totalGasFeesCollected.
     */
    function recordLog(
        string memory _action,
        string memory _resourceId,
        string memory _detailsHash
    ) external payable returns (uint256) {
        require(msg.value >= ACTION_GAS_FEE, "Insufficient gas fee for audit action");

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
     */
    function recordSystemLog(
        string memory _action,
        string memory _resourceId,
        string memory _detailsHash
    ) external onlyAuthorized returns (uint256) {
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
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
}
