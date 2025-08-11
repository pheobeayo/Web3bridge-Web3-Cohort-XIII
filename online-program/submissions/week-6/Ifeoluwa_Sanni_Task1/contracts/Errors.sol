// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


library Errors {
    // Access control errors
    error NotTheOwner();
    error NotAuthorized();
    
    // Plan validation errors
    error PlanDoesNotExist();
    error PlanNotActive();
    error InvalidLockPeriod();
    error InvalidAmount();
    
    // Time-related errors
    error LockPeriodNotCompleted();
    error LockPeriodAlreadyCompleted();
    
    // Transfer errors
    error ETHAmountMismatch();
    error NoETHShouldBeSent();
    error TransferFailed();
    
    // Contract state errors
    error ContractNotFound();
    error InvalidContract();
}