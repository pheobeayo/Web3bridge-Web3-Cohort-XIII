import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("TokenGatedDAO", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployTokenGatedDAOFixture() {
    // Get signers
    const [owner, proposer, voter1, voter2, voter3, executor, nonMember] = await ethers.getSigners();

    // Deploy mock contracts
    const MockERC7432 = await ethers.getContractFactory("MockERC7432");
    const mockRoleContract = await MockERC7432.deploy();

    const MockDAOMembershipNFT = await ethers.getContractFactory("MockDAOMembershipNFT");
    const mockMembershipNFT = await MockDAOMembershipNFT.deploy();

    // Deploy TokenGatedDAO
    const TokenGatedDAO = await ethers.getContractFactory("TokenGatedDAO");
    const tokenGatedDAO = await TokenGatedDAO.deploy(
      await mockRoleContract.getAddress(),
      await mockMembershipNFT.getAddress()
    );

    // Define role constants
    const VOTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VOTER_ROLE"));
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));

    // Setup mock NFTs and roles
    await mockMembershipNFT.mint(proposer.address, 0);
    await mockMembershipNFT.mint(voter1.address, 1);
    await mockMembershipNFT.mint(voter2.address, 2);
    await mockMembershipNFT.mint(voter3.address, 3);
    await mockMembershipNFT.mint(executor.address, 4);

    // Setup roles for each NFT
    await mockRoleContract.grantRole(PROPOSER_ROLE, await mockMembershipNFT.getAddress(), 0, proposer.address);
    await mockRoleContract.grantRole(VOTER_ROLE, await mockMembershipNFT.getAddress(), 0, proposer.address);
    await mockRoleContract.grantRole(VOTER_ROLE, await mockMembershipNFT.getAddress(), 1, voter1.address);
    await mockRoleContract.grantRole(VOTER_ROLE, await mockMembershipNFT.getAddress(), 2, voter2.address);
    await mockRoleContract.grantRole(VOTER_ROLE, await mockMembershipNFT.getAddress(), 3, voter3.address);
    await mockRoleContract.grantRole(EXECUTOR_ROLE, await mockMembershipNFT.getAddress(), 4, executor.address);

    return {
      tokenGatedDAO,
      mockRoleContract,
      mockMembershipNFT,
      owner,
      proposer,
      voter1,
      voter2,
      voter3,
      executor,
      nonMember,
      VOTER_ROLE,
      PROPOSER_ROLE,
      EXECUTOR_ROLE,
      ADMIN_ROLE,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct role contract and membership NFT", async function () {
      const { tokenGatedDAO, mockRoleContract, mockMembershipNFT } = await loadFixture(deployTokenGatedDAOFixture);

      expect(await tokenGatedDAO.roleContract()).to.equal(await mockRoleContract.getAddress());
      expect(await tokenGatedDAO.membershipNFT()).to.equal(await mockMembershipNFT.getAddress());
    });

    it("Should set default voting period and quorum percentage", async function () {
      const { tokenGatedDAO } = await loadFixture(deployTokenGatedDAOFixture);

      expect(await tokenGatedDAO.votingPeriod()).to.equal(7 * 24 * 60 * 60); // 7 days
      expect(await tokenGatedDAO.quorumPercentage()).to.equal(30);
    });
  });

  describe("Role Validation", function () {
    it("Should correctly validate roles for NFT owners", async function () {
      const { tokenGatedDAO, proposer, voter1, nonMember, VOTER_ROLE, PROPOSER_ROLE } = await loadFixture(deployTokenGatedDAOFixture);

      expect(await tokenGatedDAO.hasValidRole(PROPOSER_ROLE, proposer.address)).to.be.true;
      expect(await tokenGatedDAO.hasValidRole(VOTER_ROLE, voter1.address)).to.be.true;
      expect(await tokenGatedDAO.hasValidRole(VOTER_ROLE, nonMember.address)).to.be.false;
    });

    it("Should calculate correct voting weight", async function () {
      const { tokenGatedDAO, voter1, proposer, nonMember } = await loadFixture(deployTokenGatedDAOFixture);

      expect(await tokenGatedDAO.getVotingWeight(voter1.address)).to.equal(1);
      expect(await tokenGatedDAO.getVotingWeight(proposer.address)).to.equal(1); // Has voter role
      expect(await tokenGatedDAO.getVotingWeight(nonMember.address)).to.equal(0);
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow users with PROPOSER_ROLE to create proposals", async function () {
      const { tokenGatedDAO, proposer } = await loadFixture(deployTokenGatedDAOFixture);

      await expect(tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description"))
        .to.emit(tokenGatedDAO, "ProposalCreated")
        .withArgs(0, proposer.address, "Test Proposal");
    });

    it("Should not allow users without PROPOSER_ROLE to create proposals", async function () {
      const { tokenGatedDAO, nonMember } = await loadFixture(deployTokenGatedDAOFixture);

      await expect(tokenGatedDAO.connect(nonMember).createProposal("Test Proposal", "Test Description"))
        .to.be.revertedWithCustomError(tokenGatedDAO, "InsufficientRolePermissions");
    });

    it("Should increment proposal counter", async function () {
      const { tokenGatedDAO, proposer } = await loadFixture(deployTokenGatedDAOFixture);

      expect(await tokenGatedDAO.proposalCount()).to.equal(0);
      
      await tokenGatedDAO.connect(proposer).createProposal("Proposal 1", "Description 1");
      expect(await tokenGatedDAO.proposalCount()).to.equal(1);
      
      await tokenGatedDAO.connect(proposer).createProposal("Proposal 2", "Description 2");
      expect(await tokenGatedDAO.proposalCount()).to.equal(2);
    });

    it("Should set correct proposal details", async function () {
      const { tokenGatedDAO, proposer } = await loadFixture(deployTokenGatedDAOFixture);

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");
      
      const proposal = await tokenGatedDAO.getProposal(0);
      expect(proposal.id).to.equal(0);
      expect(proposal.proposer).to.equal(proposer.address);
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.description).to.equal("Test Description");
      expect(proposal.yesVotes).to.equal(0);
      expect(proposal.noVotes).to.equal(0);
      expect(proposal.executed).to.be.false;
    });
  });

  describe("Voting", function () {
    it("Should allow users with VOTER_ROLE to vote", async function () {
      const { tokenGatedDAO, proposer, voter1 } = await loadFixture(deployTokenGatedDAOFixture);

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");

      await expect(tokenGatedDAO.connect(voter1).vote(0, true))
        .to.emit(tokenGatedDAO, "VoteCast")
        .withArgs(0, voter1.address, true, 1);
    });

    it("Should not allow users without VOTER_ROLE to vote", async function () {
      const { tokenGatedDAO, proposer, nonMember } = await loadFixture(deployTokenGatedDAOFixture);

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");

      await expect(tokenGatedDAO.connect(nonMember).vote(0, true))
        .to.be.revertedWithCustomError(tokenGatedDAO, "InsufficientRolePermissions");
    });

    it("Should not allow voting on non-existent proposals", async function () {
      const { tokenGatedDAO, voter1 } = await loadFixture(deployTokenGatedDAOFixture);

      await expect(tokenGatedDAO.connect(voter1).vote(999, true))
        .to.be.revertedWithCustomError(tokenGatedDAO, "ProposalDoesNotExist");
    });

    it("Should not allow double voting", async function () {
      const { tokenGatedDAO, proposer, voter1 } = await loadFixture(deployTokenGatedDAOFixture);

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");
      await tokenGatedDAO.connect(voter1).vote(0, true);

      await expect(tokenGatedDAO.connect(voter1).vote(0, false))
        .to.be.revertedWithCustomError(tokenGatedDAO, "AlreadyVoted");
    });

    it("Should not allow voting after voting period ends", async function () {
      const { tokenGatedDAO, proposer, voter1 } = await loadFixture(deployTokenGatedDAOFixture);

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");
      
      // Fast forward past voting period
      await time.increase(8 * 24 * 60 * 60); // 8 days

      await expect(tokenGatedDAO.connect(voter1).vote(0, true))
        .to.be.revertedWithCustomError(tokenGatedDAO, "VotingEnded");
    });

    it("Should correctly tally votes", async function () {
      const { tokenGatedDAO, proposer, voter1, voter2, voter3 } = await loadFixture(deployTokenGatedDAOFixture);

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");
      
      await tokenGatedDAO.connect(voter1).vote(0, true);
      await tokenGatedDAO.connect(voter2).vote(0, true);
      await tokenGatedDAO.connect(voter3).vote(0, false);

      const proposal = await tokenGatedDAO.getProposal(0);
      expect(proposal.yesVotes).to.equal(2);
      expect(proposal.noVotes).to.equal(1);
    });
  });

  describe("Proposal Execution", function () {
    it("Should allow execution of successful proposals", async function () {
      const { tokenGatedDAO, proposer, voter1, voter2, executor } = await loadFixture(deployTokenGatedDAOFixture);

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");
      
      // Vote with enough support (2 yes votes out of 5 total supply = 40% > 30% quorum)
      await tokenGatedDAO.connect(proposer).vote(0, true);
      await tokenGatedDAO.connect(voter1).vote(0, true);
      await tokenGatedDAO.connect(voter2).vote(0, true);

      // Fast forward past voting period
      await time.increase(8 * 24 * 60 * 60);

      await expect(tokenGatedDAO.connect(executor).executeProposal(0))
        .to.emit(tokenGatedDAO, "ProposalExecuted")
        .withArgs(0);
    });

    it("Should not allow execution without EXECUTOR_ROLE", async function () {
      const { tokenGatedDAO, proposer, voter1, voter2 } = await loadFixture(deployTokenGatedDAOFixture);

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");
      
      await tokenGatedDAO.connect(proposer).vote(0, true);
      await tokenGatedDAO.connect(voter1).vote(0, true);
      await tokenGatedDAO.connect(voter2).vote(0, true);

      await time.increase(8 * 24 * 60 * 60);

      await expect(tokenGatedDAO.connect(voter1).executeProposal(0))
        .to.be.revertedWithCustomError(tokenGatedDAO, "InsufficientRolePermissions");
    });

    it("Should not allow execution before voting ends", async function () {
      const { tokenGatedDAO, proposer, voter1, voter2, executor } = await loadFixture(deployTokenGatedDAOFixture);

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");
      
      await tokenGatedDAO.connect(proposer).vote(0, true);
      await tokenGatedDAO.connect(voter1).vote(0, true);
      await tokenGatedDAO.connect(voter2).vote(0, true);

      await expect(tokenGatedDAO.connect(executor).executeProposal(0))
        .to.be.revertedWithCustomError(tokenGatedDAO, "VotingNotEnded");
    });

    it("Should not allow execution without quorum", async function () {
      const { tokenGatedDAO, proposer, voter1, executor } = await loadFixture(deployTokenGatedDAOFixture);

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");
      
      // Only 1 vote out of 5 total supply = 20% < 30% quorum
      await tokenGatedDAO.connect(voter1).vote(0, true);

      await time.increase(8 * 24 * 60 * 60);

      await expect(tokenGatedDAO.connect(executor).executeProposal(0))
        .to.be.revertedWithCustomError(tokenGatedDAO, "QuorumNotMet");
    });

    it("Should not allow execution of rejected proposals", async function () {
      const { tokenGatedDAO, proposer, voter1, voter2, voter3, executor } = await loadFixture(deployTokenGatedDAOFixture);

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");
      
      // More no votes than yes votes
      await tokenGatedDAO.connect(voter1).vote(0, true);
      await tokenGatedDAO.connect(voter2).vote(0, false);
      await tokenGatedDAO.connect(voter3).vote(0, false);

      await time.increase(8 * 24 * 60 * 60);

      await expect(tokenGatedDAO.connect(executor).executeProposal(0))
        .to.be.revertedWithCustomError(tokenGatedDAO, "ProposalRejected");
    });

    it("Should not allow double execution", async function () {
      const { tokenGatedDAO, proposer, voter1, voter2, executor } = await loadFixture(deployTokenGatedDAOFixture);

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");
      
      await tokenGatedDAO.connect(proposer).vote(0, true);
      await tokenGatedDAO.connect(voter1).vote(0, true);
      await tokenGatedDAO.connect(voter2).vote(0, true);

      await time.increase(8 * 24 * 60 * 60);

      await tokenGatedDAO.connect(executor).executeProposal(0);

      await expect(tokenGatedDAO.connect(executor).executeProposal(0))
        .to.be.revertedWithCustomError(tokenGatedDAO, "ProposalNotActive");
    });
  });

  describe("Proposal State", function () {
    it("Should return correct proposal states", async function () {
      const { tokenGatedDAO, proposer, voter1, voter2 } = await loadFixture(deployTokenGatedDAOFixture);

      // Non-existent proposal
      expect(await tokenGatedDAO.getProposalState(999)).to.equal(0); // Pending

      await tokenGatedDAO.connect(proposer).createProposal("Test Proposal", "Test Description");
      
      // Active proposal
      expect(await tokenGatedDAO.getProposalState(0)).to.equal(1); // Active

      await tokenGatedDAO.connect(proposer).vote(0, true);
      await tokenGatedDAO.connect(voter1).vote(0, true);
      await tokenGatedDAO.connect(voter2).vote(0, true);

      // Fast forward past voting period
      await time.increase(8 * 24 * 60 * 60);

      // Succeeded proposal
      expect(await tokenGatedDAO.getProposalState(0)).to.equal(3); // Succeeded
    });
  });

  describe("Gas Optimization", function () {
    it("Should handle multiple NFTs owned by same user efficiently", async function () {
      const { tokenGatedDAO, mockMembershipNFT, mockRoleContract, voter1, VOTER_ROLE } = await loadFixture(deployTokenGatedDAOFixture);

      // Mint additional NFT to voter1
      await mockMembershipNFT.mint(voter1.address, 5);
      await mockRoleContract.grantRole(VOTER_ROLE, await mockMembershipNFT.getAddress(), 5, voter1.address);

      // Should have voting weight of 2 now
      expect(await tokenGatedDAO.getVotingWeight(voter1.address)).to.equal(2);
    });
  });
});