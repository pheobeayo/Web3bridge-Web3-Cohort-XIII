// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IERC20.sol";

contract StakingContract {
    error ZeroAmount();
    error InsufficientBalance();
    error InsufficientStake();
    error StakeLocked();
    error TransferFailed();
    error OnlyOwner();
    error InvalidAddress();
    error InvalidLockPeriod();
    error MismatchedInputLengths();
    error NoRewardsToClaim();
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event StakeInitiated(address indexed user, uint256 amount, uint256 unlockTime);
    
    // State variables
    address public owner;
    IERC20 public tokenA; 
    IERC20 public tokenB;
    uint256 public lockPeriod; 
    
    //mapping
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public unlockTimes; 
    

    uint256 public totalStaked;
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address _tokenA, address _tokenB, uint256 _lockPeriod) {
        if (_tokenA == address(0) || _tokenB == address(0)) revert InvalidAddress();
        if (_lockPeriod == 0) revert InvalidLockPeriod();
        
        owner = msg.sender;
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
        lockPeriod = _lockPeriod;
    }
    
    function stake(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (tokenA.balanceOf(msg.sender) < amount) revert InsufficientBalance();
        
        if (!tokenA.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        
        stakes[msg.sender] += amount;
        totalStaked += amount;
        
        unlockTimes[msg.sender] = block.timestamp + lockPeriod;
        tokenB.mint(msg.sender, amount);
        
        emit Staked(msg.sender, amount);
        emit StakeInitiated(msg.sender, amount, unlockTimes[msg.sender]);
    }
    
    function unstake(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (stakes[msg.sender] < amount) revert InsufficientStake();
        if (block.timestamp < unlockTimes[msg.sender]) revert StakeLocked();
        if (tokenB.balanceOf(msg.sender) < amount) revert InsufficientBalance();
        
        stakes[msg.sender] -= amount;
        totalStaked -= amount;
        
        if (stakes[msg.sender] == 0) {
            unlockTimes[msg.sender] = 0;
        }
        
        tokenB.burn(msg.sender, amount);
        
        if (!tokenA.transfer(msg.sender, amount)) revert TransferFailed();
        
        emit Unstaked(msg.sender, amount);
    }
    
    function getStakeInfo(address user) external view returns (uint256 amount, uint256 unlockTime) {
        return (stakes[user], unlockTimes[user]);
    }
    
    function distributeRewards(address[] calldata users, uint256[] calldata amounts) external onlyOwner {
        if (users.length != amounts.length) revert MismatchedInputLengths();
        
        for (uint256 i = 0; i < users.length; i++) {
            rewards[users[i]] += amounts[i];
            emit RewardPaid(users[i], amounts[i]);
        }
    }
    
    function isUnlocked(address user) external view returns (bool) {
        return block.timestamp >= unlockTimes[user] && stakes[user] > 0;
    }
    
    function getRemainingLockTime(address user) external view returns (uint256) {
        if (block.timestamp >= unlockTimes[user] || stakes[user] == 0) {
            return 0;
        }
        return unlockTimes[user] - block.timestamp;
    }
    
    function getContractInfo() external view returns (
        address tokenAAddress,
        address tokenBAddress,
        uint256 lockPeriodSeconds,
        uint256 totalStakedAmount
    ) {
        return (
            address(tokenA),
            address(tokenB),
            lockPeriod,
            totalStaked
        );
    }
    
    function emergencyRecover(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }
    
    function claimRewards() external {
        uint256 reward = rewards[msg.sender];
        if (reward == 0) revert NoRewardsToClaim();
        
        rewards[msg.sender] = 0;
        
        emit RewardPaid(msg.sender, reward);
    }
}

