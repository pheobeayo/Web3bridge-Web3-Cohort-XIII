// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DAOMembershipNFT is ERC721, Ownable {
    error ZeroAddressNotAllowed();
    error MaxSupplyExceeded();

    event MembershipMinted(address indexed to, uint256 indexed tokenId);

    uint256 private _nextTokenId;
    uint256 public maxSupply;
    string private _baseTokenURI;

    constructor(string memory name, string memory symbol, uint256 _maxSupply) 
        ERC721(name, symbol) Ownable(msg.sender) {
        maxSupply = _maxSupply;
    }

    function mint(address to) external onlyOwner returns (uint256) {
        if (to == address(0)) revert ZeroAddressNotAllowed();
        
        uint256 tokenId = _nextTokenId;
        if (maxSupply > 0 && tokenId >= maxSupply) revert MaxSupplyExceeded();

        _nextTokenId++;
        _safeMint(to, tokenId);

        emit MembershipMinted(to, tokenId);
        return tokenId;
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}