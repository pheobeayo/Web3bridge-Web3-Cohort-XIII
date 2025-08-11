// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PiggyBankSavings.sol";
import "./Errors.sol";


contract PiggyBankFactory is Ownable {
    using Errors for *;
    
    struct UserInfo {
        address[] savingsContracts;
        uint256 totalContracts;
    }
    
    mapping(address => UserInfo) public userInfo;
    mapping(address => bool) public isSavingsContract;
    
    address[] public allSavingsContracts;
    
    event SavingsContractCreated(address indexed user, address indexed savingsContract, uint256 contractIndex);
    
    constructor() Ownable(msg.sender) {}
    
    function createSavingsAccount() external returns (address) {
        PiggyBankSavings newSavingsContract = new PiggyBankSavings(msg.sender, owner());
        address contractAddress = address(newSavingsContract);
        
        userInfo[msg.sender].savingsContracts.push(contractAddress);
        userInfo[msg.sender].totalContracts++;
        
        allSavingsContracts.push(contractAddress);
        isSavingsContract[contractAddress] = true;
        
        emit SavingsContractCreated(msg.sender, contractAddress, userInfo[msg.sender].totalContracts);
        
        return contractAddress;
    }
    
    function getUserSavingsContracts(address user) external view returns (address[] memory) {
        return userInfo[user].savingsContracts;
    }
    
    function getUserContractCount(address user) external view returns (uint256) {
        return userInfo[user].totalContracts;
    }
    
    function getUserTotalBalance(address user, address token) external view returns (uint256) {
        uint256 totalBalance = 0;
        address[] memory contracts = userInfo[user].savingsContracts;
        
        for (uint256 i = 0; i < contracts.length; i++) {
            PiggyBankSavings savingsContract = PiggyBankSavings(contracts[i]);
            totalBalance += savingsContract.getTotalBalance(token);
        }
        
        return totalBalance;
    }
    
    function getUserAllBalances(address user) external view returns (
        address[] memory contracts,
        uint256[] memory ethBalances,
        uint256[] memory activePlans
    ) {
        address[] memory userContracts = userInfo[user].savingsContracts;
        contracts = userContracts;
        ethBalances = new uint256[](userContracts.length);
        activePlans = new uint256[](userContracts.length);
        
        for (uint256 i = 0; i < userContracts.length; i++) {
            PiggyBankSavings savingsContract = PiggyBankSavings(userContracts[i]);
            ethBalances[i] = savingsContract.getTotalBalance(address(0)); // ETH balance
            activePlans[i] = savingsContract.getActivePlansCount();
        }
    }
    
    function getAllSavingsContracts() external view returns (address[] memory) {
        return allSavingsContracts;
    }
    
    function getTotalSavingsContracts() external view returns (uint256) {
        return allSavingsContracts.length;
    }
    
    // Admin functions
    function withdrawAdminFees(address token, uint256 amount) external onlyOwner {
        if (amount == 0) {
            revert Errors.InvalidAmount();
        }
        
        if (token == address(0)) {
            (bool success, ) = payable(owner()).call{value: amount}("");
            if (!success) {
                revert Errors.TransferFailed();
            }
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
    
    function getAdminBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(token).balanceOf(address(this));
        }
    }
    
    // Verify if a contract is a valid savings contract created by this factory
    function isValidSavingsContract(address contractAddress) external view returns (bool) {
        return isSavingsContract[contractAddress];
    }
    
    // Emergency function to receive ETH
    receive() external payable {}
}