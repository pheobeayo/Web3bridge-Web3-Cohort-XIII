// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "forge-std/Script.sol";
import "../src/DynamicTimeNFT.sol";

contract DeployDynamicTimeNFT is Script {
    // Lisk Sepolia configuration
    string constant NETWORK_NAME = "Lisk Sepolia";
    uint256 constant CHAIN_ID = 4202;
   
    function run() external returns (DynamicTimeNFT) {
        
        uint256 deployerPrivateKey;
        
        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
        } catch {
            // If envUint fails, try envString and convert
            string memory keyString = vm.envString("PRIVATE_KEY");
            // Remove "0x" prefix if present and convert
            if (bytes(keyString).length > 2 && 
                bytes(keyString)[0] == "0" && 
                bytes(keyString)[1] == "x") {
                deployerPrivateKey = vm.parseUint(keyString);
            } else {
                // Add "0x" prefix and convert
                string memory prefixedKey = string(abi.encodePacked("0x", keyString));
                deployerPrivateKey = vm.parseUint(prefixedKey);
            }
        }
        
        address deployer = vm.addr(deployerPrivateKey);
       
        console.log("=== DEPLOYMENT CONFIGURATION ===");
        console.log("Network:", NETWORK_NAME);
        console.log("Chain ID:", CHAIN_ID);
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance / 1e18, "ETH");
       
        // Check if we have enough ETH for deployment
        require(deployer.balance > 0.001 ether, "Insufficient ETH balance for deployment");
       
        vm.startBroadcast(deployerPrivateKey);
       
        // Deploy the contract
        console.log("\n=== DEPLOYING CONTRACT ===");
        DynamicTimeNFT nft = new DynamicTimeNFT();
       
        vm.stopBroadcast();
       
        // Log deployment results
        console.log("\n=== DEPLOYMENT SUCCESSFUL ===");
        console.log("Contract Name:", nft.name());
        console.log("Contract Symbol:", nft.symbol());
        console.log("Contract Address:", address(nft));
        console.log("Transaction Hash: Check your terminal for tx hash");
        console.log("Block Explorer: https://sepolia-blockscout.lisk.com/address/%s", address(nft));
       
        // Verify contract supports expected interfaces
        console.log("\n=== CONTRACT VERIFICATION ===");
        console.log("ERC721 Interface:", nft.supportsInterface(type(IERC721).interfaceId));
        console.log("ERC721Metadata Interface:", nft.supportsInterface(type(IERC721Metadata).interfaceId));
       
        return nft;
    }
   
    // Helper function to estimate deployment gas
    function estimateGas() external view {
        uint256 gasEstimate = 2000000;
        uint256 gasPrice = 20 gwei;
        uint256 estimatedCost = gasEstimate * gasPrice;
       
        console.log("=== GAS ESTIMATION ===");
        console.log("Estimated Gas:", gasEstimate);
        console.log("Gas Price:", gasPrice / 1e9, "gwei");
        console.log("Estimated Cost:", estimatedCost / 1e18, "ETH");
    }
}