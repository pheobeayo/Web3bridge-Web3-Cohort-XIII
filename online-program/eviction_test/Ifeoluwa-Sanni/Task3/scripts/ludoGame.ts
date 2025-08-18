const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Starting LudoGame deployment...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  // Deploy the contract
  const LudoGame = await ethers.getContractFactory("LudoGame");
  console.log("Deploying LudoGame...");
  
  const ludoGame = await LudoGame.deploy();
  await ludoGame.deployed();
  
  console.log("LudoGame deployed to:", ludoGame.address);
  console.log("Transaction hash:", ludoGame.deployTransaction.hash);
  
  // Save deployment information
  const deploymentInfo = {
    address: ludoGame.address,
    deployer: deployer.address,
    deploymentHash: ludoGame.deployTransaction.hash,
    timestamp: new Date().toISOString(),
    network: hre.network.name,
    blockNumber: ludoGame.deployTransaction.blockNumber
  };
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  // Save deployment info to file
  fs.writeFileSync(
    `${deploymentsDir}/${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`Deployment info saved to ${deploymentsDir}/${hre.network.name}.json`);
  
  // Wait for a few block confirmations before verification
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await ludoGame.deployTransaction.wait(6);
    
    // Verify the contract
    try {
      console.log("Verifying contract on Etherscan...");
      await hre.run("verify:verify", {
        address: ludoGame.address,
        constructorArguments: [],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.error("Verification failed:", error.message);
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified!");
      }
    }
  }
  
  // Display contract information
  console.log("\n=== Deployment Summary ===");
  console.log("Contract Address:", ludoGame.address);
  console.log("Owner:", await ludoGame.owner());
  console.log("Token Price:", ethers.utils.formatEther(await ludoGame.tokenPrice()), "ETH");
  console.log("Game Counter:", (await ludoGame.gameCounter()).toString());
  
  // Test basic functionality
  console.log("\n=== Testing Basic Functionality ===");
  
  // Test token purchase
  const tokenPrice = await ludoGame.tokenPrice();
  const purchaseTx = await ludoGame.purchaseTokens({ value: tokenPrice.mul(5) });
  await purchaseTx.wait();
  
  const tokens = await ludoGame.getPlayerTokens(deployer.address);
  console.log("Tokens purchased:", tokens.toString());
  
  // Test game creation
  const createTx = await ludoGame.createGame(2);
  const createReceipt = await createTx.wait();
  const gameId = 0;
  
  console.log("Game created with ID:", gameId);
  
  // Test player registration
  const registerTx = await ludoGame.registerPlayer(gameId, "TestPlayer", 1); // RED color
  await registerTx.wait();
  
  const player = await ludoGame.getPlayer(gameId, deployer.address);
  console.log("Player registered:", player.name, "Color:", player.color);
  
  console.log("\n=== Deployment and Testing Complete ===");
  
  return ludoGame.address;
}

// Run the deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };