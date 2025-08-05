// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./TokenA.sol";
import "./TokenB.sol";
import "./StakingContract.sol";

contract StakingFactory {
    event StakingSystemDeployed(
        address indexed tokenA,
        address indexed tokenB,
        address indexed stakingContract,
        uint256 lockPeriod
    );
    
    struct StakingSystem {
        address tokenA;
        address tokenB;
        address stakingContract;
        uint256 lockPeriod;
        uint256 deployedAt;
    }
    
    mapping(address => StakingSystem[]) public deployedSystems;
    StakingSystem[] public allSystems;
    
    function deployStakingSystem(
        uint256 tokenAInitialSupply,
        uint256 lockPeriodInDays
    ) external returns (address tokenA, address tokenB, address stakingContract) {
        
        uint256 lockPeriodSeconds = lockPeriodInDays * 1 days;
        
        
        TokenA _tokenA = new TokenA(tokenAInitialSupply);
        

        TokenB _tokenB = new TokenB();
        
    
        StakingContract _stakingContract = new StakingContract(
            address(_tokenA),
            address(_tokenB),
            lockPeriodSeconds
        );
        
        
        _tokenB.setStakingContract(address(_stakingContract));
        
    
        _tokenA.transferOwnership(msg.sender);
        
        
        StakingSystem memory newSystem = StakingSystem({
            tokenA: address(_tokenA),
            tokenB: address(_tokenB),
            stakingContract: address(_stakingContract),
            lockPeriod: lockPeriodSeconds,
            deployedAt: block.timestamp
        });
        
        deployedSystems[msg.sender].push(newSystem);
        allSystems.push(newSystem);
        
        emit StakingSystemDeployed(
            address(_tokenA),
            address(_tokenB),
            address(_stakingContract),
            lockPeriodSeconds
        );
        
        return (address(_tokenA), address(_tokenB), address(_stakingContract));
    }
    
    function getUserDeployments(address user) external view returns (StakingSystem[] memory) {
        return deployedSystems[user];
    }
    
    function getAllDeployments() external view returns (StakingSystem[] memory) {
        return allSystems;
    }
    
    function getDeploymentCount() external view returns (uint256) {
        return allSystems.length;
    }
}

