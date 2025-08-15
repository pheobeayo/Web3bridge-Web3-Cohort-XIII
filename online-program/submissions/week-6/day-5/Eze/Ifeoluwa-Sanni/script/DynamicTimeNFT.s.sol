// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/DynamicTimeNFT.sol";



contract DynamicTimeNFTScript is Script {
    function run() external {
        // Initialize contract locally instead of using storage
        address contractAddress = vm.envAddress("CONTRACT_ADDRESS");
        DynamicTimeNFT nft = DynamicTimeNFT(contractAddress);
        
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address user = vm.addr(privateKey);
        
        vm.startBroadcast(privateKey);
        
        // Mint a token
        console.log("Minting token to:", user);
        uint256 tokenId = nft.mint(user);
        console.log("Minted token ID:", tokenId);
        
        vm.stopBroadcast();
        
        // View token URI (this doesn't require a transaction)
        string memory uri = nft.tokenURI(tokenId);
        console.log("Token URI:");
        console.log(uri);
        
        // You can decode this base64 to see the actual JSON and SVG
    }
}



contract ViewTokenData is Script {
    function run() external view {
        address contractAddress = vm.envAddress("CONTRACT_ADDRESS");
        uint256 tokenId = vm.envUint("TOKEN_ID");
        
        DynamicTimeNFT nft = DynamicTimeNFT(contractAddress);
        
        console.log("Contract:", contractAddress);
        console.log("Token ID:", tokenId);
        console.log("Owner:", nft.ownerOf(tokenId));
        console.log("Current block timestamp:", block.timestamp);
        
        string memory uri = nft.tokenURI(tokenId);
        console.log("Token URI (first 100 chars):");
        
        // Show first 100 characters of the URI
        bytes memory uriBytes = bytes(uri);
        if (uriBytes.length > 100) {
            for (uint i = 0; i < 100; i++) {
                console.logBytes1(uriBytes[i]);
            }
            console.log("... (truncated)");
        } else {
            console.log(uri);
        }
    }
}