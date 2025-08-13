// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockDAOMembershipNFT {
    mapping(uint256 => address) private _owners;
    mapping(uint256 => bool) private _exists;
    uint256 private _totalSupply;
    
    function mint(address to, uint256 tokenId) external {
        require(!_exists[tokenId], "Token already exists");
        _owners[tokenId] = to;
        _exists[tokenId] = true;
        _totalSupply++;
    }
    
    function ownerOf(uint256 tokenId) external view returns (address) {
        require(_exists[tokenId], "Token does not exist");
        return _owners[tokenId];
    }
    
    function exists(uint256 tokenId) external view returns (bool) {
        return _exists[tokenId];
    }
    
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }
    
    function burn(uint256 tokenId) external {
        require(_exists[tokenId], "Token does not exist");
        delete _owners[tokenId];
        _exists[tokenId] = false;
        _totalSupply--;
    }
}