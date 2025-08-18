const { ethers } = require("hardhat");

async function main() {
    console.log("🎲 Starting Lottery Contract Deployment and Testing...\n");

    // Get signers
    const [deployer, ...testAccounts] = await ethers.getSigners();
    const ENTRY_FEE = ethers.parseEther("0.01");
    const MAX_PLAYERS = 10;

    console.log("🚀 DEPLOYMENT PHASE");
    console.log("==================");
    console.log("💰 Deployer address:", deployer.address);
    console.log("💰 Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    console.log("🌐 Network:", hre.network.name);
    
    // Ensure we have enough test accounts
    if (testAccounts.length < 15) {
        throw new Error("Need at least 15 test accounts for comprehensive testing");
    }
    
    console.log("👥 Available test accounts:", testAccounts.length);
    console.log("");

    // Deploy the contract
    console.log("📦 Deploying Lottery contract...");
    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy();
    await lottery.waitForDeployment();
    
    const contractAddress = await lottery.getAddress();
    console.log("✅ Lottery contract deployed to:", contractAddress);
    console.log("🔗 Transaction hash:", lottery.deploymentTransaction().hash);
    
    // Calculate deployment cost
    const deployTx = await ethers.provider.getTransaction(lottery.deploymentTransaction().hash);
    const deployReceipt = await ethers.provider.getTransactionReceipt(lottery.deploymentTransaction().hash);
    const deploymentCost = deployTx.gasPrice * deployReceipt.gasUsed;
    console.log("⛽ Deployment cost:", ethers.formatEther(deploymentCost), "ETH");
    console.log("");

    // Display initial contract state
    const initialInfo = await lottery.getLotteryInfo();
    console.log("📊 INITIAL CONTRACT STATE");
    console.log("========================");
    console.log("   Round:", initialInfo[0].toString());
    console.log("   Players Count:", initialInfo[1].toString());
    console.log("   Prize Pool:", ethers.formatEther(initialInfo[2]), "ETH");
    console.log("   Entry Fee:", ethers.formatEther(ENTRY_FEE), "ETH");
    console.log("   Max Players:", MAX_PLAYERS);
    console.log("");

    // Function to display account balances
    async function displayBalances(accounts, title, maxDisplay = 10) {
        console.log(`💳 ${title}:`);
        for (let i = 0; i < Math.min(accounts.length, maxDisplay); i++) {
            const balance = await ethers.provider.getBalance(accounts[i].address);
            console.log(`   Account ${i + 1}: ${accounts[i].address.slice(0, 8)}...${accounts[i].address.slice(-6)} - ${ethers.formatEther(balance)} ETH`);
        }
        console.log("");
    }

    // Display initial balances
    await displayBalances(testAccounts, "Initial Test Account Balances");

    // First Round - Add 10 players
    console.log("🎯 FIRST LOTTERY ROUND");
    console.log("🚀 Adding 10 players to the lottery...");
    
    const firstRoundBalancesBefore = [];
    
    for (let i = 0; i < 10; i++) {
        // Record balance before entry
        firstRoundBalancesBefore[i] = await ethers.provider.getBalance(testAccounts[i].address);
        
        console.log(`   Player ${i + 1} (${testAccounts[i].address}) joining...`);
        
        const tx = await lottery.connect(testAccounts[i]).enterLottery({ value: ENTRY_FEE });
        const receipt = await tx.wait();
        
        // Get current state
        const playersCount = await lottery.getPlayersCount();
        const prizePool = await lottery.getContractBalance();
        
        console.log(`   ✅ Player ${i + 1} joined! Players: ${playersCount}, Prize Pool: ${ethers.formatEther(prizePool)} ETH`);
        
        // If this was the 10th player, the lottery should have reset
        if (i === 9) {
            const winnerEvent = receipt.logs.find(log => {
                try {
                    const parsed = lottery.interface.parseLog(log);
                    return parsed && parsed.name === "WinnerSelected";
                } catch (e) {
                    return false;
                }
            });
            
            if (winnerEvent) {
                const parsed = lottery.interface.parseLog(winnerEvent);
                const winner = parsed.args[0];
                const prizeAmount = parsed.args[1];
                
                console.log(`\n🎉 WINNER SELECTED!`);
                console.log(`🏆 Winner: ${winner}`);
                console.log(`💰 Prize Amount: ${ethers.formatEther(prizeAmount)} ETH`);
                
                // Find which account won
                const winnerIndex = testAccounts.findIndex(account => account.address.toLowerCase() === winner.toLowerCase());
                if (winnerIndex !== -1) {
                    console.log(`🎊 Congratulations to Player ${winnerIndex + 1}!\n`);
                }
            }
        }
    }

    // Display post-first-round state
    const afterFirstRound = await lottery.getLotteryInfo();
    console.log("📊 After First Round:");
    console.log("   Round:", afterFirstRound[0].toString());
    console.log("   Players Count:", afterFirstRound[1].toString());
    console.log("   Prize Pool:", ethers.formatEther(afterFirstRound[2]), "ETH");
    console.log("   Last Winner:", afterFirstRound[3]);
    console.log("   Last Prize:", ethers.formatEther(afterFirstRound[4]), "ETH\n");

    // Show balance changes
    console.log("💸 Balance Changes After First Round:");
    for (let i = 0; i < 10; i++) {
        const balanceAfter = await ethers.provider.getBalance(testAccounts[i].address);
        const balanceChange = balanceAfter - firstRoundBalancesBefore[i];
        const isWinner = testAccounts[i].address.toLowerCase() === afterFirstRound[3].toLowerCase();
        
        console.log(`   Player ${i + 1}: ${ethers.formatEther(balanceChange)} ETH ${isWinner ? '🏆 WINNER!' : ''}`);
    }
    console.log("");

    // Second Round - Verify reset functionality
    console.log("🎯 SECOND LOTTERY ROUND (Verifying Reset)");
    console.log("🔄 Testing lottery reset by adding players to new round...");
    
    // Add 5 players to the new round
    for (let i = 10; i < 15; i++) {
        console.log(`   Player ${i + 1} (${testAccounts[i].address}) joining round 2...`);
        
        await lottery.connect(testAccounts[i]).enterLottery({ value: ENTRY_FEE });
        
        const playersCount = await lottery.getPlayersCount();
        const prizePool = await lottery.getContractBalance();
        
        console.log(`   ✅ Player ${i + 1} joined round 2! Players: ${playersCount}, Prize Pool: ${ethers.formatEther(prizePool)} ETH`);
    }

    // Final state
    const finalInfo = await lottery.getLotteryInfo();
    console.log("\n📊 Final Contract State:");
    console.log("   Round:", finalInfo[0].toString());
    console.log("   Players Count:", finalInfo[1].toString());
    console.log("   Prize Pool:", ethers.formatEther(finalInfo[2]), "ETH");
    console.log("   Contract Balance:", ethers.formatEther(await ethers.provider.getBalance(contractAddress)), "ETH");

    // Verify players can't enter twice in same round
    console.log("\n🔒 Testing Security: Attempting duplicate entry...");
    try {
        await lottery.connect(testAccounts[10]).enterLottery({ value: ENTRY_FEE });
        console.log("❌ ERROR: Duplicate entry should have failed!");
    } catch (error) {
        console.log("✅ Duplicate entry correctly rejected:", error.message.split("'")[1]);
    }

    // Test incorrect entry fee
    console.log("\n🔒 Testing Security: Attempting incorrect entry fee...");
    try {
        const wrongFee = ethers.parseEther("0.005");
        await lottery.connect(testAccounts[19]).enterLottery({ value: wrongFee });
        console.log("❌ ERROR: Incorrect fee should have failed!");
    } catch (error) {
        console.log("✅ Incorrect fee correctly rejected:", error.message.split("'")[1]);
    }

    console.log("\n🎉 Deployment and testing completed successfully!");
    console.log("📝 Contract Address:", contractAddress);
    console.log("🔍 Verify on Etherscan:", `https://etherscan.io/address/${contractAddress}`);
    
    // Save contract address to file
    const fs = require('fs');
    const deploymentInfo = {
        contractAddress: contractAddress,
        deploymentTransaction: lottery.deploymentTransaction().hash,
        network: hre.network.name,
        timestamp: new Date().toISOString(),
        deployer: deployer.address
    };
    
    fs.writeFileSync('lottery-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to lottery-deployment.json");
}

// Error handling
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during deployment:");
        console.error(error);
        process.exit(1);
    });