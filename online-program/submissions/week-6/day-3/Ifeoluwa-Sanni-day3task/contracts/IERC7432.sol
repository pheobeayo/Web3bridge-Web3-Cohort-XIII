// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// ===== IERC7432 Interface =====
interface IERC7432 {
    struct Role {
        bytes32 roleId;
        address account;
        uint256 tokenId;
        address tokenAddress;
        uint64 expirationDate;
        bool revocable;
        bytes data;
    }
   
    event RoleGranted(
        bytes32 indexed roleId,
        address indexed tokenAddress,
        uint256 indexed tokenId,
        address grantor,
        address grantee,
        uint64 expirationDate,
        bool revocable,
        bytes data
    );
   
    event RoleRevoked(
        bytes32 indexed roleId,
        address indexed tokenAddress,
        uint256 indexed tokenId,
        address revoker,
        address revokee
    );
   
    function grantRole(
        bytes32 roleId,
        address tokenAddress,
        uint256 tokenId,
        address account,
        uint64 expirationDate,
        bool revocable,
        bytes calldata data
    ) external;
   
    function revokeRole(
        bytes32 roleId,
        address tokenAddress,
        uint256 tokenId,
        address account
    ) external;
   
    function hasRole(
        bytes32 roleId,
        address tokenAddress,
        uint256 tokenId,
        address account
    ) external view returns (bool);
   
    function roleData(
        bytes32 roleId,
        address tokenAddress,
        uint256 tokenId,
        address account
    ) external view returns (bytes memory);
   
    function roleExpirationDate(
        bytes32 roleId,
        address tokenAddress,
        uint256 tokenId,
        address account
    ) external view returns (uint64);
}