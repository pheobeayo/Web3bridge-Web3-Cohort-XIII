import { ethers } from "ethers";
import { ContractFactory, Contract, Wallet } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Types and Interfaces
interface DeployedContracts {
  membershipNFT: Contract;
  roleContract: Contract;
  dao: Contract;
}

interface DAOConfig {
  nftName: string;
  nftSymbol: string;
  maxSupply: number;
  votingPeriod: number; // in seconds
  quorumPercentage: number;
}

interface ProposalData {
  title: string;
  description: string;
}

interface MemberData {
  address: string;
  roles: string[];
  roleExpirationDays: number;
}

class DAOAutomation {
  private provider: ethers.Provider;
  private wallet: Wallet;
  private contracts: DeployedContracts | null = null;
  private config: DAOConfig;

  // Role definitions
  private readonly ROLES = {
    VOTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("VOTER_ROLE")),
    PROPOSER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE")),
    EXECUTOR_ROLE: ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE")),
    ADMIN_ROLE: ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"))
  };

  constructor(
    providerUrl: string,
    privateKey: string,
    config: DAOConfig
  ) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.wallet = new Wallet(privateKey, this.provider);
    this.config = config;
  }

  // Deploy all contracts
  async deployContracts(): Promise<DeployedContracts> {
    try {
      console.log("🚀 Starting DAO deployment...");
      console.log(`Deployer address: ${this.wallet.address}`);

      // Deploy DAOMembershipNFT
      console.log("\n📜 Deploying DAOMembershipNFT...");
      const membershipNFT = await this.deployMembershipNFT();
      
      // Deploy ERC7432 Role Contract
      console.log("\n🔐 Deploying ERC7432 Role Contract...");
      const roleContract = await this.deployRoleContract();
      
      // Deploy TokenGatedDAO
      console.log("\n🏛️ Deploying TokenGatedDAO...");
      const dao = await this.deployDAO(roleContract.target, membershipNFT.target);

      this.contracts = { membershipNFT, roleContract, dao };

      console.log("\n✅ All contracts deployed successfully!");
      console.log(`DAOMembershipNFT: ${membershipNFT.target}`);
      console.log(`ERC7432: ${roleContract.target}`);
      console.log(`TokenGatedDAO: ${dao.target}`);

      // Save deployment info
      await this.saveDeploymentInfo();

      return this.contracts;
    } catch (error) {
      console.error("❌ Deployment failed:", error);
      throw error;
    }
  }

  private async deployMembershipNFT(): Promise<Contract> {
    const contractCode = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.28;
      import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
      import "@openzeppelin/contracts/access/Ownable.sol";
      // ... (contract code from the artifact)
    `;

    // In a real implementation, you'd compile the contract and get the bytecode/ABI
    // For this example, assuming you have the compiled artifacts
    const factory = new ContractFactory(
      [], // ABI would go here
      "0x", // Bytecode would go here
      this.wallet
    );

    const contract = await factory.deploy(
      this.config.nftName,
      this.config.nftSymbol,
      this.config.maxSupply
    );
    
    await contract.waitForDeployment();
    return contract;
  }

  private async deployRoleContract(): Promise<Contract> {
    // Similar deployment for ERC7432
    const factory = new ContractFactory(
      [], // ERC7432 ABI
      "0x", // ERC7432 bytecode
      this.wallet
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  private async deployDAO(roleContractAddress: string, nftContractAddress: string): Promise<Contract> {
    // Similar deployment for TokenGatedDAO
    const factory = new ContractFactory(
      [], // DAO ABI
      "0x", // DAO bytecode
      this.wallet
    );

    const contract = await factory.deploy(roleContractAddress, nftContractAddress);
    await contract.waitForDeployment();
    return contract;
  }

  // Mint NFT to address
  async mintMembership(toAddress: string): Promise<ethers.TransactionResponse> {
    if (!this.contracts) throw new Error("Contracts not deployed");

    console.log(`🎨 Minting membership NFT to ${toAddress}...`);
    
    const tx = await this.contracts.membershipNFT.mint(toAddress);
    await tx.wait();
    
    console.log(`✅ NFT minted! Transaction: ${tx.hash}`);
    return tx;
  }

  // Batch mint NFTs
  async batchMintMemberships(addresses: string[]): Promise<ethers.TransactionResponse[]> {
    const transactions: ethers.TransactionResponse[] = [];
    
    console.log(`🎨 Batch minting ${addresses.length} membership NFTs...`);
    
    for (const address of addresses) {
      const tx = await this.mintMembership(address);
      transactions.push(tx);
      
      // Add delay to avoid nonce issues
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return transactions;
  }

  // Grant role to member
  async grantRole(
    roleKey: keyof typeof this.ROLES,
    memberAddress: string,
    tokenId: number,
    expirationDays: number = 365,
    revocable: boolean = true
  ): Promise<ethers.TransactionResponse> {
    if (!this.contracts) throw new Error("Contracts not deployed");

    const roleId = this.ROLES[roleKey];
    const expirationDate = Math.floor(Date.now() / 1000) + (expirationDays * 24 * 60 * 60);
    
    console.log(`🔑 Granting ${roleKey} to ${memberAddress} for token ${tokenId}...`);
    
    const tx = await this.contracts.roleContract.grantRole(
      roleId,
      this.contracts.membershipNFT.target,
      tokenId,
      memberAddress,
      expirationDate,
      revocable,
      "0x" // empty data
    );
    
    await tx.wait();
    console.log(`✅ Role granted! Transaction: ${tx.hash}`);
    return tx;
  }

  // Setup initial members with roles
  async setupMembers(members: MemberData[]): Promise<void> {
    console.log(`👥 Setting up ${members.length} members...`);
    
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      
      // Mint NFT first
      await this.mintMembership(member.address);
      
      // Grant roles
      for (const role of member.roles) {
        if (role in this.ROLES) {
          await this.grantRole(
            role as keyof typeof this.ROLES,
            member.address,
            i, // tokenId
            member.roleExpirationDays
          );
        }
      }
      
      console.log(`✅ Member ${member.address} setup complete`);
    }
  }

  // Create a proposal
  async createProposal(proposal: ProposalData): Promise<number> {
    if (!this.contracts) throw new Error("Contracts not deployed");

    console.log(`📝 Creating proposal: ${proposal.title}...`);
    
    const tx = await this.contracts.dao.createProposal(
      proposal.title,
      proposal.description
    );
    
    const receipt = await tx.wait();
    
    // Extract proposal ID from event logs
    const proposalId = await this.contracts.dao.proposalCount() - 1;
    
    console.log(`✅ Proposal created with ID: ${proposalId}`);
    return Number(proposalId);
  }

  // Vote on proposal
  async vote(proposalId: number, support: boolean): Promise<ethers.TransactionResponse> {
    if (!this.contracts) throw new Error("Contracts not deployed");

    console.log(`🗳️ Voting ${support ? 'YES' : 'NO'} on proposal ${proposalId}...`);
    
    const tx = await this.contracts.dao.vote(proposalId, support);
    await tx.wait();
    
    console.log(`✅ Vote cast! Transaction: ${tx.hash}`);
    return tx;
  }

  // Execute proposal
  async executeProposal(proposalId: number): Promise<ethers.TransactionResponse> {
    if (!this.contracts) throw new Error("Contracts not deployed");

    console.log(`⚡ Executing proposal ${proposalId}...`);
    
    const tx = await this.contracts.dao.executeProposal(proposalId);
    await tx.wait();
    
    console.log(`✅ Proposal executed! Transaction: ${tx.hash}`);
    return tx;
  }

  // Get proposal information
  async getProposal(proposalId: number): Promise<any> {
    if (!this.contracts) throw new Error("Contracts not deployed");

    const proposal = await this.contracts.dao.getProposal(proposalId);
    const state = await this.contracts.dao.getProposalState(proposalId);
    
    return {
      id: proposal.id,
      proposer: proposal.proposer,
      title: proposal.title,
      description: proposal.description,
      startTime: new Date(Number(proposal.startTime) * 1000),
      endTime: new Date(Number(proposal.endTime) * 1000),
      yesVotes: Number(proposal.yesVotes),
      noVotes: Number(proposal.noVotes),
      executed: proposal.executed,
      state: ['Pending', 'Active', 'Defeated', 'Succeeded', 'Executed'][state]
    };
  }

  // Get member information
  async getMemberInfo(address: string): Promise<any> {
    if (!this.contracts) throw new Error("Contracts not deployed");

    const balance = await this.contracts.membershipNFT.balanceOf(address);
    const votingWeight = await this.contracts.dao.getVotingWeight(address);
    
    const roles = [];
    for (const [roleName, roleId] of Object.entries(this.ROLES)) {
      const hasRole = await this.contracts.dao.hasValidRole(roleId, address);
      if (hasRole) {
        roles.push(roleName);
      }
    }

    return {
      address,
      nftBalance: Number(balance),
      votingWeight: Number(votingWeight),
      roles
    };
  }

  // Save deployment information to file
  private async saveDeploymentInfo(): Promise<void> {
    if (!this.contracts) return;

    const deploymentInfo = {
      network: await this.provider.getNetwork(),
      timestamp: new Date().toISOString(),
      deployer: this.wallet.address,
      contracts: {
        membershipNFT: this.contracts.membershipNFT.target,
        roleContract: this.contracts.roleContract.target,
        dao: this.contracts.dao.target
      },
      config: this.config
    };

    const filePath = path.join(__dirname, 'deployment.json');
    fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`📄 Deployment info saved to ${filePath}`);
  }

  // Load existing deployment
  async loadDeployment(deploymentFile: string): Promise<void> {
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    // Reconnect to existing contracts
    this.contracts = {
      membershipNFT: new Contract(deploymentInfo.contracts.membershipNFT, [], this.wallet),
      roleContract: new Contract(deploymentInfo.contracts.roleContract, [], this.wallet),
      dao: new Contract(deploymentInfo.contracts.dao, [], this.wallet)
    };
    
    console.log("✅ Connected to existing deployment");
  }
}

// Example usage and automation scenarios
export class DAOScenarios {
  private dao: DAOAutomation;

  constructor(dao: DAOAutomation) {
    this.dao = dao;
  }

  // Scenario: Setup a complete DAO from scratch
  async setupCompleteDAO(): Promise<void> {
    console.log("🏗️ Setting up complete DAO...");

    // Deploy contracts
    await this.dao.deployContracts();

    // Setup initial members
    const initialMembers: MemberData[] = [
      {
        address: "0x63E5a246937549b3ECcBB410AF42da54F999D172", // Replace with actual addresses
        roles: ["ADMIN_ROLE", "PROPOSER_ROLE", "EXECUTOR_ROLE", "VOTER_ROLE"],
        roleExpirationDays: 365
      },
      {
        address: "0x3F01E90459c9931B2ff9a40BF81933273e7ea209", // Replace with actual addresses
        roles: ["PROPOSER_ROLE", "VOTER_ROLE"],
        roleExpirationDays: 365
      },
      {
        address: "0x8B3ecF29f52c6C4943dbAD4f34D8b79077C238dd", // Replace with actual addresses
        roles: ["VOTER_ROLE"],
        roleExpirationDays: 365
      }
    ];

    await this.dao.setupMembers(initialMembers);

    console.log("✅ Complete DAO setup finished!");
  }

  // Scenario: Run a governance cycle
  async runGovernanceCycle(): Promise<void> {
    console.log("🗳️ Running governance cycle...");

    // Create a proposal
    const proposalId = await this.dao.createProposal({
      title: "Increase Membership Limit",
      description: "Proposal to increase the maximum number of DAO members from 100 to 200"
    });

    // Wait for voting period to be active
    console.log("⏳ Waiting for voting period...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cast some votes
    await this.dao.vote(proposalId, true); // Vote yes

    // Check proposal status
    const proposal = await this.dao.getProposal(proposalId);
    console.log("📊 Proposal status:", proposal);

    // Execute if passed (in real scenario, wait for voting period to end)
    if (proposal.state === 'Succeeded') {
      await this.dao.executeProposal(proposalId);
    }

    console.log("✅ Governance cycle complete!");
  }

  // Scenario: Member management
  async manageMembership(): Promise<void> {
    console.log("👥 Managing membership...");

    // Add new member
    const newMemberAddress = "0x1234567890123456789012345678901234567890";
    await this.dao.mintMembership(newMemberAddress);
    
    // Grant voter role
    await this.dao.grantRole("VOTER_ROLE", newMemberAddress, 3, 365); // assuming tokenId 3

    // Check member info
    const memberInfo = await this.dao.getMemberInfo(newMemberAddress);
    console.log("👤 New member info:", memberInfo);

    console.log("✅ Membership management complete!");
  }
}

// Main execution function
async function main() {
  // Configuration
  const config: DAOConfig = {
    nftName: "DAO Membership",
    nftSymbol: "DAOMEM",
    maxSupply: 1000,
    votingPeriod: 7 * 24 * 60 * 60, // 7 days in seconds
    quorumPercentage: 30
  };

  // Initialize DAO automation
  const dao = new DAOAutomation(
    process.env.RPC_URL || "http://localhost:8545",
    process.env.PRIVATE_KEY || "0x...",
    config
  );

  // Initialize scenarios
  const scenarios = new DAOScenarios(dao);

  try {
    // Run different scenarios based on command line arguments
    const scenario = process.argv[2] || "setup";

    switch (scenario) {
      case "setup":
        await scenarios.setupCompleteDAO();
        break;
      case "governance":
        await scenarios.runGovernanceCycle();
        break;
      case "members":
        await scenarios.manageMembership();
        break;
      default:
        console.log("Available scenarios: setup, governance, members");
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

// Export for use as a module
export { DAOAutomation, DAOScenarios, DAOConfig, MemberData, ProposalData };

// Run if called directly
if (require.main === module) {
  main();
}