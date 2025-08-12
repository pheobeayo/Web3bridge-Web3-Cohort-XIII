const { expect } = require("chai");
const { ethers: hardhatEthers } = require("hardhat");

describe("PiggyBank Savings System", function () {
  let factory: any;
  let savingsContract: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let mockToken: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await hardhatEthers.getSigners();

    // Deploy factory
    const PiggyBankFactory = await hardhatEthers.getContractFactory("PiggyBankFactory");
    factory = await PiggyBankFactory.deploy();
    await factory.waitForDeployment();

    // Create a savings account
    const tx = await factory.connect(addr1).createSavingsAccount();
    await tx.wait();

    const userContracts = await factory.getUserSavingsContracts(addr1.address);
    const PiggyBankSavings = await hardhatEthers.getContractFactory("PiggyBankSavings");
    savingsContract = PiggyBankSavings.attach(userContracts[0]);

    // Deploy mock ERC20 token for testing
    const MockToken = await hardhatEthers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Test Token", "TEST", hardhatEthers.parseEther("1000"));
    await mockToken.waitForDeployment();
  });

  describe("Factory Tests", function () {
    it("Should create savings account", async function () {
      const userContracts = await factory.getUserSavingsContracts(addr1.address);
      expect(userContracts.length).to.equal(1);
    });

    it("Should track total contracts", async function () {
      const total = await factory.getTotalSavingsContracts();
      expect(total).to.equal(1);
    });
  });

  describe("Savings Contract Tests", function () {
    it("Should create ETH savings plan", async function () {
      const amount = hardhatEthers.parseEther("1");
      const lockPeriod = 30; // 30 days

      await savingsContract.connect(addr1).createSavingsPlan(
        hardhatEthers.ZeroAddress, // ETH
        amount,
        lockPeriod,
        { value: amount }
      );

      const plan = await savingsContract.getSavingsPlan(0);
      expect(plan.amount).to.equal(amount);
      expect(plan.token).to.equal(hardhatEthers.ZeroAddress);
      expect(plan.isActive).to.be.true;
    });

    it("Should fail to withdraw before lock period", async function () {
      const amount = hardhatEthers.parseEther("1");
      const lockPeriod = 30;

      await savingsContract.connect(addr1).createSavingsPlan(
        hardhatEthers.ZeroAddress,
        amount,
        lockPeriod,
        { value: amount }
      );

      await expect(
        savingsContract.connect(addr1).withdrawSavings(0)
      ).to.be.revertedWithCustomError(savingsContract, "LockPeriodNotCompleted");
    });

    it("Should allow emergency withdrawal with fee", async function () {
      const amount = hardhatEthers.parseEther("1");
      const lockPeriod = 30;

      await savingsContract.connect(addr1).createSavingsPlan(
        hardhatEthers.ZeroAddress,
        amount,
        lockPeriod,
        { value: amount }
      );

      const balanceBefore = await hardhatEthers.provider.getBalance(addr1.address);
      
      const tx = await savingsContract.connect(addr1).emergencyWithdraw(0);
      const receipt = await tx.wait();
      
      const balanceAfter = await hardhatEthers.provider.getBalance(addr1.address);
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      // Should receive 97% of deposited amount (3% fee)
      const expectedReceived = amount * 97n / 100n;
      const actualReceived = balanceAfter - balanceBefore + gasUsed;
      
      expect(actualReceived).to.be.closeTo(expectedReceived, hardhatEthers.parseEther("0.01"));
    });

    it("Should only allow owner to create plans", async function () {
      const amount = hardhatEthers.parseEther("1");
      
      await expect(
        savingsContract.connect(addr2).createSavingsPlan(
          hardhatEthers.ZeroAddress,
          amount,
          30,
          { value: amount }
        )
      ).to.be.revertedWithCustomError(savingsContract, "NotTheOwner");
    });

    it("Should get all savings plans", async function () {
      const amount1 = hardhatEthers.parseEther("1");
      const amount2 = hardhatEthers.parseEther("2");

      await savingsContract.connect(addr1).createSavingsPlan(
        hardhatEthers.ZeroAddress,
        amount1,
        30,
        { value: amount1 }
      );

      await savingsContract.connect(addr1).createSavingsPlan(
        hardhatEthers.ZeroAddress,
        amount2,
        60,
        { value: amount2 }
      );

      const allPlans = await savingsContract.getAllSavingsPlans();
      expect(allPlans.amounts.length).to.equal(2);
      expect(allPlans.amounts[0]).to.equal(amount1);
      expect(allPlans.amounts[1]).to.equal(amount2);
    });
  });

  describe("Custom Error Tests", function () {
    it("Should revert with custom error for invalid lock period", async function () {
      await expect(
        savingsContract.connect(addr1).createSavingsPlan(
          hardhatEthers.ZeroAddress,
          hardhatEthers.parseEther("1"),
          0, // Invalid lock period
          { value: hardhatEthers.parseEther("1") }
        )
      ).to.be.revertedWithCustomError(savingsContract, "InvalidLockPeriod");
    });

    it("Should revert with custom error for ETH amount mismatch", async function () {
      await expect(
        savingsContract.connect(addr1).createSavingsPlan(
          hardhatEthers.ZeroAddress,
          hardhatEthers.parseEther("1"),
          30,
          { value: hardhatEthers.parseEther("0.5") } // Mismatched value
        )
      ).to.be.revertedWithCustomError(savingsContract, "ETHAmountMismatch");
    });
  });

  describe("ERC20 Token Tests", function () {
    it("Should create ERC20 savings plan", async function () {
      const amount = hardhatEthers.parseEther("100");
      const lockPeriod = 30;

      // Get contract addresses
      const mockTokenAddress = await mockToken.getAddress();
      const savingsContractAddress = await savingsContract.getAddress();

      // First, transfer tokens to addr1 and approve the savings contract
      await mockToken.transfer(addr1.address, amount);
      await mockToken.connect(addr1).approve(savingsContractAddress, amount);

      await savingsContract.connect(addr1).createSavingsPlan(
        mockTokenAddress,
        amount,
        lockPeriod,
        { value: 0 } // No ETH for ERC20
      );

      const plan = await savingsContract.getSavingsPlan(0);
      expect(plan.amount).to.equal(amount);
      expect(plan.token).to.equal(mockTokenAddress);
      expect(plan.isActive).to.be.true;
    });
  });
});

