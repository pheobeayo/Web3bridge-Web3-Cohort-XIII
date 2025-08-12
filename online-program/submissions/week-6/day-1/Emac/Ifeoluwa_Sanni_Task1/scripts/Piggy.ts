const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy PiggyBankFactory
  console.log("Deploying PiggyBankFactory...");
  const PiggyBankFactory = await ethers.getContractFactory("PiggyBankFactory");
  const factory = await PiggyBankFactory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("PiggyBankFactory deployed to:", factoryAddress);

  // Verify deployment
  console.log("Verifying deployment...");
  const totalContracts = await factory.getTotalSavingsContracts();
  console.log("Total savings contracts:", totalContracts.toString());

  // Create a test savings account
  console.log("\nCreating test savings account...");
  const tx = await factory.createSavingsAccount();
  const receipt = await tx.wait();
  
  const userContracts = await factory.getUserSavingsContracts(deployer.address);
  console.log("User's first savings contract:", userContracts[0]);

  console.log("\n=== Deployment Summary ===");
  console.log("PiggyBankFactory:", factoryAddress);
  console.log("First Savings Contract:", userContracts[0]);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  
  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    factory: factoryAddress,
    firstSavingsContract: userContracts[0],
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };

  console.log("\nDeployment info saved. You can use these addresses for interaction.");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });