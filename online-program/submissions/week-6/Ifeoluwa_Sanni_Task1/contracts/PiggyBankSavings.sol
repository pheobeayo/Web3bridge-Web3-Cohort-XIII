// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Errors.sol";


contract PiggyBankSavings is ReentrancyGuard {
    using Errors for *;
    
    struct SavingsPlan {
        uint256 amount;
        uint256 lockPeriod;
        uint256 startTime;
        address token; // address(0) for ETH, token address for ERC20
        bool isActive;
    }
    
    address public factory;
    address public owner;
    address public factoryAdmin;
    
    mapping(uint256 => SavingsPlan) public savingsPlans;
    uint256 public planCounter;
    uint256 public constant BREAKING_FEE_PERCENT = 3;
    
    event SavingsDeposited(uint256 indexed planId, address indexed token, uint256 amount, uint256 lockPeriod);
    event SavingsWithdrawn(uint256 indexed planId, address indexed token, uint256 amount, uint256 fee);
    event EmergencyWithdrawn(uint256 indexed planId, address indexed token, uint256 amount, uint256 fee);
    
    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Errors.NotTheOwner();
        }
        _;
    }
    
    modifier planExists(uint256 planId) {
        if (planId >= planCounter) {
            revert Errors.PlanDoesNotExist();
        }
        if (!savingsPlans[planId].isActive) {
            revert Errors.PlanNotActive();
        }
        _;
    }
    
    constructor(address _owner, address _factoryAdmin) {
        factory = msg.sender;
        owner = _owner;
        factoryAdmin = _factoryAdmin;
    }
    
    function createSavingsPlan(
        address token,
        uint256 amount,
        uint256 lockPeriodInDays
    ) external payable onlyOwner nonReentrant {
        if (lockPeriodInDays == 0) {
            revert Errors.InvalidLockPeriod();
        }
        
        if (token == address(0)) {
            // ETH deposit
            if (msg.value != amount) {
                revert Errors.ETHAmountMismatch();
            }
            if (amount == 0) {
                revert Errors.InvalidAmount();
            }
        } else {
            // ERC20 deposit
            if (msg.value != 0) {
                revert Errors.NoETHShouldBeSent();
            }
            if (amount == 0) {
                revert Errors.InvalidAmount();
            }
            
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }
        
        uint256 lockPeriod = lockPeriodInDays * 1 days;
        
        savingsPlans[planCounter] = SavingsPlan({
            amount: amount,
            lockPeriod: lockPeriod,
            startTime: block.timestamp,
            token: token,
            isActive: true
        });
        
        emit SavingsDeposited(planCounter, token, amount, lockPeriod);
        planCounter++;
    }
    
    function withdrawSavings(uint256 planId) external onlyOwner nonReentrant planExists(planId) {
        SavingsPlan storage plan = savingsPlans[planId];
        
        if (block.timestamp < plan.startTime + plan.lockPeriod) {
            revert Errors.LockPeriodNotCompleted();
        }
        
        uint256 amount = plan.amount;
        address token = plan.token;
        
        plan.isActive = false;
        
        if (token == address(0)) {
            // ETH withdrawal
            (bool success, ) = payable(owner).call{value: amount}("");
            if (!success) {
                revert Errors.TransferFailed();
            }
        } else {
            // ERC20 withdrawal
            IERC20(token).transfer(owner, amount);
        }
        
        emit SavingsWithdrawn(planId, token, amount, 0);
    }
    
    function emergencyWithdraw(uint256 planId) external onlyOwner nonReentrant planExists(planId) {
        SavingsPlan storage plan = savingsPlans[planId];
        
        if (block.timestamp >= plan.startTime + plan.lockPeriod) {
            revert Errors.LockPeriodAlreadyCompleted();
        }
        
        uint256 fee = (plan.amount * BREAKING_FEE_PERCENT) / 100;
        uint256 withdrawAmount = plan.amount - fee;
        address token = plan.token;
        
        plan.isActive = false;
        
        if (token == address(0)) {
            // ETH withdrawal with fee
            (bool successOwner, ) = payable(owner).call{value: withdrawAmount}("");
            if (!successOwner) {
                revert Errors.TransferFailed();
            }
            
            (bool successAdmin, ) = payable(factoryAdmin).call{value: fee}("");
            if (!successAdmin) {
                revert Errors.TransferFailed();
            }
        } else {
            // ERC20 withdrawal with fee
            IERC20(token).transfer(owner, withdrawAmount);
            IERC20(token).transfer(factoryAdmin, fee);
        }
        
        emit EmergencyWithdrawn(planId, token, withdrawAmount, fee);
    }
    
    function getSavingsPlan(uint256 planId) external view returns (
        uint256 amount,
        uint256 lockPeriod,
        uint256 startTime,
        address token,
        bool isActive,
        uint256 remainingTime
    ) {
        if (planId >= planCounter) {
            revert Errors.PlanDoesNotExist();
        }
        
        SavingsPlan memory plan = savingsPlans[planId];
        uint256 endTime = plan.startTime + plan.lockPeriod;
        uint256 remaining = 0;
        
        if (block.timestamp < endTime) {
            remaining = endTime - block.timestamp;
        }
        
        return (
            plan.amount,
            plan.lockPeriod,
            plan.startTime,
            plan.token,
            plan.isActive,
            remaining
        );
    }
    
    function getAllSavingsPlans() external view returns (
        uint256[] memory amounts,
        uint256[] memory lockPeriods,
        uint256[] memory startTimes,
        address[] memory tokens,
        bool[] memory activeStatus,
        uint256[] memory remainingTimes
    ) {
        amounts = new uint256[](planCounter);
        lockPeriods = new uint256[](planCounter);
        startTimes = new uint256[](planCounter);
        tokens = new address[](planCounter);
        activeStatus = new bool[](planCounter);
        remainingTimes = new uint256[](planCounter);
        
        for (uint256 i = 0; i < planCounter; i++) {
            SavingsPlan memory plan = savingsPlans[i];
            amounts[i] = plan.amount;
            lockPeriods[i] = plan.lockPeriod;
            startTimes[i] = plan.startTime;
            tokens[i] = plan.token;
            activeStatus[i] = plan.isActive;
            
            uint256 endTime = plan.startTime + plan.lockPeriod;
            if (block.timestamp < endTime) {
                remainingTimes[i] = endTime - block.timestamp;
            } else {
                remainingTimes[i] = 0;
            }
        }
    }
    
    function getTotalBalance(address token) external view returns (uint256) {
        uint256 totalBalance = 0;
        
        for (uint256 i = 0; i < planCounter; i++) {
            if (savingsPlans[i].isActive && savingsPlans[i].token == token) {
                totalBalance += savingsPlans[i].amount;
            }
        }
        
        return totalBalance;
    }
    
    function getActivePlansCount() external view returns (uint256) {
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < planCounter; i++) {
            if (savingsPlans[i].isActive) {
                activeCount++;
            }
        }
        
        return activeCount;
    }
}