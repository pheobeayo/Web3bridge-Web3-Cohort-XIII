// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


contract MockERC7432 {
    mapping(bytes32 => mapping(address => mapping(uint256 => mapping(address => bool)))) private _roles;
    
    function grantRole(bytes32 role, address tokenContract, uint256 tokenId, address account) external {
        _roles[role][tokenContract][tokenId][account] = true;
    }
    
    function revokeRole(bytes32 role, address tokenContract, uint256 tokenId, address account) external {
        _roles[role][tokenContract][tokenId][account] = false;
    }
    
    function hasRole(bytes32 role, address tokenContract, uint256 tokenId, address account) external view returns (bool) {
        return _roles[role][tokenContract][tokenId][account];
    }
}

