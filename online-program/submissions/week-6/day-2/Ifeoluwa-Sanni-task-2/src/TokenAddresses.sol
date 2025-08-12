// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


library TokenAddresses {
    // Major stablecoins
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    
    // ETH and wrapped ETH
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    
    // Popular DeFi tokens  
    address public constant UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;
    address public constant LINK = 0x514910771AF9Ca656af840dff83E8264EcF986CA;
    address public constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    
    // Uniswap Router
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
}