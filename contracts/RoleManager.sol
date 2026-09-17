// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IdentityRegistry.sol";

/**
 * @title RoleManager
 * @dev Manages Role-Based Access Control (RBAC) on-chain
 *      4 Roles: ADMIN, VIEWER, ALTER, DEBUGGER
 */
contract RoleManager is Ownable {
    IdentityRegistry public identityRegistry;

    // Role constants — 4 levels
    string public constant ROLE_ADMIN = "ADMIN";
    string public constant ROLE_VIEWER = "VIEWER";
    string public constant ROLE_ALTER = "ALTER";
    string public constant ROLE_DEBUGGER = "DEBUGGER";

    mapping(address => mapping(string => bool)) private userRoles;

    event RoleAssigned(address indexed user, string role);
    event RoleRevoked(address indexed user, string role);

    constructor(address _identityRegistry) Ownable(msg.sender) {
        identityRegistry = IdentityRegistry(_identityRegistry);
    }

    modifier onlyActiveIdentity(address _user) {
        require(identityRegistry.isIdentityActive(_user), "User identity is not active");
        _;
    }

    function assignRole(address _user, string memory _role) external onlyOwner onlyActiveIdentity(_user) {
        require(!userRoles[_user][_role], "User already has this role");
        userRoles[_user][_role] = true;
        emit RoleAssigned(_user, _role);
    }

    function revokeRole(address _user, string memory _role) external onlyOwner {
        require(userRoles[_user][_role], "User does not have this role");
        userRoles[_user][_role] = false;
        emit RoleRevoked(_user, _role);
    }

    function hasRole(address _user, string memory _role) public view returns (bool) {
        // Must have an active identity and the specific role
        return identityRegistry.isIdentityActive(_user) && userRoles[_user][_role];
    }
}
