import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  StakingContract, 
  TokenA, 
  TokenB, 
  StakingFactory 
} from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Staking System", function () {
  let stakingContract: StakingContract;
  let tokenA: TokenA;
  let tokenB: TokenB;
  let stakingFactory: StakingFactory;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const LOCK_PERIOD = 7 * 24 * 60 * 60; // 7 days in seconds
  const STAKE_AMOUNT = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy TokenA
    const TokenAFactory = await ethers.getContractFactory("TokenA");
    tokenA = await TokenAFactory.deploy(1000000);

    // Deploy TokenB
    const TokenBFactory = await ethers.getContractFactory("TokenB");
    tokenB = await TokenBFactory.deploy();

    // Deploy StakingContract
    const StakingContractFactory = await ethers.getContractFactory("StakingContract");
    stakingContract = await StakingContractFactory.deploy(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      LOCK_PERIOD
    );

    // Set staking contract in TokenB
    await tokenB.setStakingContract(await stakingContract.getAddress());

    // Transfer some tokens to users
    await tokenA.transfer(user1.address, ethers.parseEther("10000"));
    await tokenA.transfer(user2.address, ethers.parseEther("10000"));
    await tokenA.transfer(user3.address, ethers.parseEther("5000"));

    // Deploy StakingFactory
    const StakingFactoryFactory = await ethers.getContractFactory("StakingFactory");
    stakingFactory = await StakingFactoryFactory.deploy();
  });

  describe("TokenA", function () {
    it("Should have correct initial values", async function () {
      expect(await tokenA.name()).to.equal("Staking Token A");
      expect(await tokenA.symbol()).to.equal("STKA");
      expect(await tokenA.decimals()).to.equal(18);
      expect(await tokenA.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await tokenA.owner()).to.equal(owner.address);
    });

    it("Should transfer tokens correctly", async function () {
      const transferAmount = ethers.parseEther("100");
      await expect(tokenA.transfer(user1.address, transferAmount))
        .to.emit(tokenA, "Transfer")
        .withArgs(owner.address, user1.address, transferAmount);

      expect(await tokenA.balanceOf(user1.address)).to.equal(
        ethers.parseEther("10100")
      );
    });

    it("Should approve and transferFrom correctly", async function () {
      const approveAmount = ethers.parseEther("500");
      await tokenA.connect(user1).approve(user2.address, approveAmount);
      
      expect(await tokenA.allowance(user1.address, user2.address)).to.equal(approveAmount);

      const transferAmount = ethers.parseEther("200");
      await expect(tokenA.connect(user2).transferFrom(user1.address, user3.address, transferAmount))
        .to.emit(tokenA, "Transfer")
        .withArgs(user1.address, user3.address, transferAmount);

      expect(await tokenA.balanceOf(user3.address)).to.equal(ethers.parseEther("5200"));
      expect(await tokenA.allowance(user1.address, user2.address)).to.equal(
        approveAmount - transferAmount
      );
    });

    it("Should mint tokens (owner only)", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(tokenA.mint(user1.address, mintAmount))
        .to.emit(tokenA, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, mintAmount);

      expect(await tokenA.balanceOf(user1.address)).to.equal(ethers.parseEther("11000"));
      expect(await tokenA.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
    });

    it("Should revert burn (not implemented)", async function () {
      await expect(tokenA.burn(user1.address, ethers.parseEther("100")))
        .to.be.revertedWith("TokenA: burn not implemented");
    });

    it("Should transfer ownership", async function () {
      await tokenA.transferOwnership(user1.address);
      expect(await tokenA.owner()).to.equal(user1.address);
    });

    it("Should revert on insufficient balance", async function () {
      await expect(tokenA.connect(user1).transfer(user2.address, ethers.parseEther("20000")))
        .to.be.revertedWithCustomError(tokenA, "InsufficientBalance");
    });
  });

  describe("TokenB", function () {
    it("Should have correct initial values", async function () {
      expect(await tokenB.name()).to.equal("Reward Token B");
      expect(await tokenB.symbol()).to.equal("RTKB");
      expect(await tokenB.decimals()).to.equal(18);
      expect(await tokenB.totalSupply()).to.equal(0);
      expect(await tokenB.owner()).to.equal(owner.address);
      expect(await tokenB.stakingContract()).to.equal(await stakingContract.getAddress());
    });

    it("Should only allow staking contract to mint", async function () {
      const mintAmount = ethers.parseEther("100");
      
      await expect(tokenB.mint(user1.address, mintAmount))
        .to.be.revertedWithCustomError(tokenB, "OnlyStakingContract");

      // Mint through staking contract by staking tokens
      await tokenA.connect(user1).approve(await stakingContract.getAddress(), mintAmount);
      await stakingContract.connect(user1).stake(mintAmount);
      
      // Check that TokenB was minted to user1
      expect(await tokenB.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("Should only allow staking contract to burn", async function () {
      // First mint some tokens through staking contract
      await tokenA.connect(user1).approve(await stakingContract.getAddress(), STAKE_AMOUNT);
      await stakingContract.connect(user1).stake(STAKE_AMOUNT);

      const burnAmount = ethers.parseEther("50");
      await expect(tokenB.burn(user1.address, burnAmount))
        .to.be.revertedWithCustomError(tokenB, "OnlyStakingContract");
    });

    it("Should not allow setting staking contract twice", async function () {
      await expect(tokenB.setStakingContract(user1.address))
        .to.be.revertedWithCustomError(tokenB, "StakingContractAlreadySet");
    });
  });

  describe("StakingContract", function () {
    beforeEach(async function () {
      await tokenA.connect(user1).approve(await stakingContract.getAddress(), ethers.parseEther("1000"));
      await tokenA.connect(user2).approve(await stakingContract.getAddress(), ethers.parseEther("1000"));
    });

    it("Should have correct initial values", async function () {
      expect(await stakingContract.owner()).to.equal(owner.address);
      expect(await stakingContract.tokenA()).to.equal(await tokenA.getAddress());
      expect(await stakingContract.tokenB()).to.equal(await tokenB.getAddress());
      expect(await stakingContract.lockPeriod()).to.equal(LOCK_PERIOD);
      expect(await stakingContract.totalStaked()).to.equal(0);
    });

    it("Should stake tokens correctly", async function () {
      await expect(stakingContract.connect(user1).stake(STAKE_AMOUNT))
        .to.emit(stakingContract, "Staked")
        .withArgs(user1.address, STAKE_AMOUNT)
        .and.to.emit(stakingContract, "StakeInitiated");

      expect(await stakingContract.stakes(user1.address)).to.equal(STAKE_AMOUNT);
      expect(await stakingContract.totalStaked()).to.equal(STAKE_AMOUNT);
      expect(await tokenB.balanceOf(user1.address)).to.equal(STAKE_AMOUNT);

      const [stakeAmount, unlockTime] = await stakingContract.getStakeInfo(user1.address);
      expect(stakeAmount).to.equal(STAKE_AMOUNT);
      expect(unlockTime).to.be.gt(await time.latest());
    });

    it("Should not allow unstaking before lock period", async function () {
      await stakingContract.connect(user1).stake(STAKE_AMOUNT);

      await expect(stakingContract.connect(user1).unstake(STAKE_AMOUNT))
        .to.be.revertedWithCustomError(stakingContract, "StakeLocked");
    });

    it("Should allow unstaking after lock period", async function () {
      await stakingContract.connect(user1).stake(STAKE_AMOUNT);

      // Fast forward time
      await time.increase(LOCK_PERIOD + 1);

      await expect(stakingContract.connect(user1).unstake(STAKE_AMOUNT))
        .to.emit(stakingContract, "Unstaked")
        .withArgs(user1.address, STAKE_AMOUNT);

      expect(await stakingContract.stakes(user1.address)).to.equal(0);
      expect(await stakingContract.totalStaked()).to.equal(0);
      expect(await tokenB.balanceOf(user1.address)).to.equal(0);
    });

    it("Should allow partial unstaking", async function () {
      await stakingContract.connect(user1).stake(STAKE_AMOUNT);
      await time.increase(LOCK_PERIOD + 1);

      const partialAmount = ethers.parseEther("50");
      await stakingContract.connect(user1).unstake(partialAmount);

      expect(await stakingContract.stakes(user1.address)).to.equal(STAKE_AMOUNT - partialAmount);
      expect(await tokenB.balanceOf(user1.address)).to.equal(STAKE_AMOUNT - partialAmount);
    });

    it("Should check unlock status correctly", async function () {
      await stakingContract.connect(user1).stake(STAKE_AMOUNT);

      expect(await stakingContract.isUnlocked(user1.address)).to.be.false;
      
      await time.increase(LOCK_PERIOD + 1);
      
      expect(await stakingContract.isUnlocked(user1.address)).to.be.true;
    });

    it("Should calculate remaining lock time correctly", async function () {
      await stakingContract.connect(user1).stake(STAKE_AMOUNT);

      const remainingTime = await stakingContract.getRemainingLockTime(user1.address);
      expect(remainingTime).to.be.closeTo(LOCK_PERIOD, 2);

      await time.increase(LOCK_PERIOD + 1);
      
      expect(await stakingContract.getRemainingLockTime(user1.address)).to.equal(0);
    });

    it("Should distribute rewards correctly", async function () {
      const users = [user1.address, user2.address];
      const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];

      await expect(stakingContract.distributeRewards(users, amounts))
        .to.emit(stakingContract, "RewardPaid")
        .withArgs(user1.address, amounts[0])
        .and.to.emit(stakingContract, "RewardPaid")
        .withArgs(user2.address, amounts[1]);

      expect(await stakingContract.rewards(user1.address)).to.equal(amounts[0]);
      expect(await stakingContract.rewards(user2.address)).to.equal(amounts[1]);
    });

    it("Should revert reward distribution with mismatched arrays", async function () {
      const users = [user1.address, user2.address];
      const amounts = [ethers.parseEther("10")]; // Mismatched length

      await expect(stakingContract.distributeRewards(users, amounts))
        .to.be.revertedWithCustomError(stakingContract, "MismatchedInputLengths");
    });

    it("Should allow claiming rewards", async function () {
      const rewardAmount = ethers.parseEther("50");
      await stakingContract.distributeRewards([user1.address], [rewardAmount]);

      await expect(stakingContract.connect(user1).claimRewards())
        .to.emit(stakingContract, "RewardPaid")
        .withArgs(user1.address, rewardAmount);

      expect(await stakingContract.rewards(user1.address)).to.equal(0);
    });

    it("Should revert claiming with no rewards", async function () {
      await expect(stakingContract.connect(user1).claimRewards())
        .to.be.revertedWithCustomError(stakingContract, "NoRewardsToClaim");
    });

    it("Should return contract info correctly", async function () {
      const [tokenAAddr, tokenBAddr, lockPeriodSec, totalStakedAmount] = 
        await stakingContract.getContractInfo();

      expect(tokenAAddr).to.equal(await tokenA.getAddress());
      expect(tokenBAddr).to.equal(await tokenB.getAddress());
      expect(lockPeriodSec).to.equal(LOCK_PERIOD);
      expect(totalStakedAmount).to.equal(0);
    });

    it("Should allow emergency recovery (owner only)", async function () {
      // Transfer some tokens to the contract
      await tokenA.transfer(await stakingContract.getAddress(), ethers.parseEther("100"));

      await stakingContract.emergencyRecover(await tokenA.getAddress(), ethers.parseEther("100"));
      
      expect(await tokenA.balanceOf(owner.address)).to.be.gt(0);
    });

    it("Should revert on zero amount operations", async function () {
      await expect(stakingContract.connect(user1).stake(0))
        .to.be.revertedWithCustomError(stakingContract, "ZeroAmount");

      await expect(stakingContract.connect(user1).unstake(0))
        .to.be.revertedWithCustomError(stakingContract, "ZeroAmount");
    });

    it("Should revert on insufficient balance/stake", async function () {
      await expect(stakingContract.connect(user1).stake(ethers.parseEther("20000")))
        .to.be.revertedWithCustomError(stakingContract, "InsufficientBalance");

      await expect(stakingContract.connect(user1).unstake(ethers.parseEther("100")))
        .to.be.revertedWithCustomError(stakingContract, "InsufficientStake");
    });

    it("Should only allow owner operations", async function () {
      await expect(stakingContract.connect(user1).distributeRewards([user1.address], [ethers.parseEther("10")]))
        .to.be.revertedWithCustomError(stakingContract, "OnlyOwner");

      await expect(stakingContract.connect(user1).emergencyRecover(await tokenA.getAddress(), 100))
        .to.be.revertedWithCustomError(stakingContract, "OnlyOwner");
    });
  });

  describe("StakingFactory", function () {
    it("Should deploy staking system correctly", async function () {
      const initialSupply = 1000000;
      const lockPeriodDays = 7;

      await expect(stakingFactory.connect(user1).deployStakingSystem(initialSupply, lockPeriodDays))
        .to.emit(stakingFactory, "StakingSystemDeployed");

      const userDeployments = await stakingFactory.getUserDeployments(user1.address);
      expect(userDeployments.length).to.equal(1);

      const deployment = userDeployments[0];
      expect(deployment.lockPeriod).to.equal(lockPeriodDays * 24 * 60 * 60);
      expect(deployment.deployedAt).to.be.gt(0);

      // Check that TokenA has correct supply and user1 is owner
      const deployedTokenA = await ethers.getContractAt("TokenA", deployment.tokenA);
      expect(await deployedTokenA.totalSupply()).to.equal(ethers.parseUnits(initialSupply.toString(), 18));
      expect(await deployedTokenA.owner()).to.equal(user1.address);

      // Check that TokenB is properly configured
      const deployedTokenB = await ethers.getContractAt("TokenB", deployment.tokenB);
      expect(await deployedTokenB.stakingContract()).to.equal(deployment.stakingContract);
    });

    it("Should track all deployments correctly", async function () {
      await stakingFactory.connect(user1).deployStakingSystem(1000000, 7);
      await stakingFactory.connect(user2).deployStakingSystem(500000, 14);

      const allDeployments = await stakingFactory.getAllDeployments();
      expect(allDeployments.length).to.equal(2);
      expect(await stakingFactory.getDeploymentCount()).to.equal(2);

      const user1Deployments = await stakingFactory.getUserDeployments(user1.address);
      const user2Deployments = await stakingFactory.getUserDeployments(user2.address);
      
      expect(user1Deployments.length).to.equal(1);
      expect(user2Deployments.length).to.equal(1);
    });

    it("Should handle multiple deployments by same user", async function () {
      await stakingFactory.connect(user1).deployStakingSystem(1000000, 7);
      await stakingFactory.connect(user1).deployStakingSystem(2000000, 14);
      await stakingFactory.connect(user1).deployStakingSystem(500000, 30);

      const userDeployments = await stakingFactory.getUserDeployments(user1.address);
      expect(userDeployments.length).to.equal(3);
      expect(await stakingFactory.getDeploymentCount()).to.equal(3);
    });
  });

  describe("Integration Tests", function () {
    it("Should work end-to-end with factory deployment", async function () {
      // Deploy through factory
      const tx = await stakingFactory.connect(user1).deployStakingSystem(1000000, 7);
      const receipt = await tx.wait();
      
      // Get deployed addresses from event
      const event = receipt?.logs.find(log => {
        try {
          const parsed = stakingFactory.interface.parseLog(log as any);
          return parsed?.name === "StakingSystemDeployed";
        } catch {
          return false;
        }
      });
      
      if (!event) throw new Error("StakingSystemDeployed event not found");
      
      const parsedEvent = stakingFactory.interface.parseLog(event as any);
      if (!parsedEvent) throw new Error("Could not parse event");
      
      const deployedTokenA = await ethers.getContractAt("TokenA", parsedEvent.args.tokenA);
      const deployedTokenB = await ethers.getContractAt("TokenB", parsedEvent.args.tokenB);
      const deployedStaking = await ethers.getContractAt("StakingContract", parsedEvent.args.stakingContract);

      // Verify the setup is correct
      expect(await deployedTokenB.stakingContract()).to.equal(await deployedStaking.getAddress());
      expect(await deployedTokenA.owner()).to.equal(user1.address);

      // Transfer some tokens to user2 for testing
      await deployedTokenA.connect(user1).transfer(user2.address, ethers.parseEther("1000"));
      expect(await deployedTokenA.balanceOf(user2.address)).to.equal(ethers.parseEther("1000"));

      // User2 stakes tokens
      await deployedTokenA.connect(user2).approve(await deployedStaking.getAddress(), ethers.parseEther("500"));
      
      // Check balances before staking
      const user2BalanceBefore = await deployedTokenA.balanceOf(user2.address);
      const contractBalanceBefore = await deployedTokenA.balanceOf(await deployedStaking.getAddress());
      
      await deployedStaking.connect(user2).stake(ethers.parseEther("500"));

      // Check balances after staking
      const user2BalanceAfter = await deployedTokenA.balanceOf(user2.address);
      const contractBalanceAfter = await deployedTokenA.balanceOf(await deployedStaking.getAddress());
      
      // Verify the token transfer worked correctly
      expect(user2BalanceAfter).to.equal(user2BalanceBefore - ethers.parseEther("500"));
      expect(contractBalanceAfter).to.equal(contractBalanceBefore + ethers.parseEther("500"));
      
      // Verify TokenB was minted
      expect(await deployedTokenB.balanceOf(user2.address)).to.equal(ethers.parseEther("500"));

      // Fast forward time past lock period
      await time.increase(7 * 24 * 60 * 60 + 1);
      
      // Verify we can unstake
      expect(await deployedStaking.isUnlocked(user2.address)).to.be.true;
      
      // Now test the problematic unstake
      await deployedStaking.connect(user2).unstake(ethers.parseEther("500"));

      // Verify final state
      expect(await deployedTokenA.balanceOf(user2.address)).to.equal(ethers.parseEther("1000"));
      expect(await deployedTokenB.balanceOf(user2.address)).to.equal(0);
    });
  });
});