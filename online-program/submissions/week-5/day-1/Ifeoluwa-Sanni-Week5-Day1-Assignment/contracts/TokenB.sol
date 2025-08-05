// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IERC20.sol";

contract TokenB is IERC20 {
    string public constant name = "Reward Token B";
    string public constant symbol = "RTKB";
    uint8 public constant decimals = 18;
    
    uint256 private _totalSupply;
    address public owner;
    address public stakingContract;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    event StakingContractSet(address indexed stakingContract);
    
    error InsufficientBalance();
    error InsufficientAllowance();
    error InvalidAddress();
    error OnlyOwner();
    error OnlyStakingContract();
    error StakingContractAlreadySet();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    modifier onlyStakingContract() {
        if (msg.sender != stakingContract) revert OnlyStakingContract();
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function setStakingContract(address _stakingContract) external onlyOwner {
        if (_stakingContract == address(0)) revert InvalidAddress();
        if (stakingContract != address(0)) revert StakingContractAlreadySet();
        
        stakingContract = _stakingContract;
        emit StakingContractSet(_stakingContract);
    }
    
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address to, uint256 amount) external override returns (bool) {
        if (to == address(0)) revert InvalidAddress();
        if (_balances[msg.sender] < amount) revert InsufficientBalance();
        
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function allowance(address owner_, address spender) external view override returns (uint256) {
        return _allowances[owner_][spender];
    }
    
    function approve(address spender, uint256 amount) external override returns (bool) {
        if (spender == address(0)) revert InvalidAddress();
        
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        if (to == address(0)) revert InvalidAddress();
        if (_balances[from] < amount) revert InsufficientBalance();
        if (_allowances[from][msg.sender] < amount) revert InsufficientAllowance();
        
        _balances[from] -= amount;
        _balances[to] += amount;
        _allowances[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) external override onlyStakingContract {
        if (to == address(0)) revert InvalidAddress();
        
        _totalSupply += amount;
        _balances[to] += amount;
        
        emit Transfer(address(0), to, amount);
    }
    
    function burn(address from, uint256 amount) external override onlyStakingContract {
        if (_balances[from] < amount) revert InsufficientBalance();
        
        _balances[from] -= amount;
        _totalSupply -= amount;
        
        emit Transfer(from, address(0), amount);
    }
}