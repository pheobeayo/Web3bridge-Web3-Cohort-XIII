// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./IERC7432.sol";

contract ERC7432 is IERC7432 {
    error ERC7432__NotTokenOwnerOrApproved();
    error ERC7432__ZeroAddressNotAllowed();
    error ERC7432__ExpirationDateInPast();
    error ERC7432__RoleDoesNotExist();
    error ERC7432__CannotRevokeRole();

    mapping(bytes32 => mapping(address => mapping(uint256 => mapping(address => Role)))) private _roles;
    mapping(bytes32 => mapping(address => mapping(uint256 => address[]))) private _roleHolders;

    modifier onlyTokenOwnerOrApproved(address tokenAddress, uint256 tokenId) {
        ERC721 token = ERC721(tokenAddress);
        address owner = token.ownerOf(tokenId);
        
        if (
            owner != msg.sender &&
            token.getApproved(tokenId) != msg.sender &&
            !token.isApprovedForAll(owner, msg.sender)
        ) {
            revert ERC7432__NotTokenOwnerOrApproved();
        }
        _;
    }

    function grantRole(
        bytes32 roleId,
        address tokenAddress,
        uint256 tokenId,
        address account,
        uint64 expirationDate,
        bool revocable,
        bytes calldata data
    ) external override onlyTokenOwnerOrApproved(tokenAddress, tokenId) {
        if (account == address(0)) revert ERC7432__ZeroAddressNotAllowed();
        if (expirationDate <= block.timestamp) revert ERC7432__ExpirationDateInPast();

        Role storage role = _roles[roleId][tokenAddress][tokenId][account];
        
        if (role.account == address(0)) {
            _roleHolders[roleId][tokenAddress][tokenId].push(account);
        }

        role.roleId = roleId;
        role.account = account;
        role.tokenId = tokenId;
        role.tokenAddress = tokenAddress;
        role.expirationDate = expirationDate;
        role.revocable = revocable;
        role.data = data;

        emit RoleGranted(roleId, tokenAddress, tokenId, msg.sender, account, expirationDate, revocable, data);
    }

    function revokeRole(
        bytes32 roleId,
        address tokenAddress,
        uint256 tokenId,
        address account
    ) external override {
        Role storage role = _roles[roleId][tokenAddress][tokenId][account];
        if (role.account == address(0)) revert ERC7432__RoleDoesNotExist();

        ERC721 token = ERC721(tokenAddress);
        address tokenOwner = token.ownerOf(tokenId);
        
        if (msg.sender != tokenOwner && !(role.revocable && msg.sender == account)) {
            revert ERC7432__CannotRevokeRole();
        }

        _removeFromHolders(roleId, tokenAddress, tokenId, account);
        delete _roles[roleId][tokenAddress][tokenId][account];

        emit RoleRevoked(roleId, tokenAddress, tokenId, msg.sender, account);
    }

    function _removeFromHolders(bytes32 roleId, address tokenAddress, uint256 tokenId, address account) private {
        address[] storage holders = _roleHolders[roleId][tokenAddress][tokenId];
        for (uint256 i = 0; i < holders.length; i++) {
            if (holders[i] == account) {
                holders[i] = holders[holders.length - 1];
                holders.pop();
                break;
            }
        }
    }

    function hasRole(bytes32 roleId, address tokenAddress, uint256 tokenId, address account) 
        external view override returns (bool) {
        Role storage role = _roles[roleId][tokenAddress][tokenId][account];
        return role.account != address(0) && role.expirationDate > block.timestamp;
    }

    function roleData(bytes32 roleId, address tokenAddress, uint256 tokenId, address account) 
        external view override returns (bytes memory) {
        return _roles[roleId][tokenAddress][tokenId][account].data;
    }

    function roleExpirationDate(bytes32 roleId, address tokenAddress, uint256 tokenId, address account) 
        external view override returns (uint64) {
        return _roles[roleId][tokenAddress][tokenId][account].expirationDate;
    }

    function getRoleHolders(bytes32 roleId, address tokenAddress, uint256 tokenId) 
        external view returns (address[] memory) {
        return _roleHolders[roleId][tokenAddress][tokenId];
    }
}