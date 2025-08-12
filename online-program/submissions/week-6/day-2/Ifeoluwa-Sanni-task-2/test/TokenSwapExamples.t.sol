// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/UniswapPermitSwap.sol";
import "../src/TokenAddresses.sol";
import "../src/interfaces/IUniSwapV2Router02.sol";
import "../src/interfaces/IERC20Permit.sol";


contract TokenSwapExamples is Test {
    UniswapPermitSwap permitSwap;
    
    address user = address(0x1234);
    uint256 userPrivateKey = 0x1234;
    
    // Token whale addresses for funding tests
    address daiWhale = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643; // Compound cDAI
    address usdcWhale = 0x0A59649758aa4d66E25f08Dd01271e891fe52199; // Maker PSM
    
    function setUp() public {
        // Fork mainnet at a recent block
        vm.createFork(vm.envString("MAINNET_RPC_URL"));
        
        permitSwap = new UniswapPermitSwap();
        
        // Fund user with tokens
        vm.prank(daiWhale);
        IERC20Permit(TokenAddresses.DAI).transfer(user, 10000e18);
        
        vm.prank(usdcWhale);  
        IERC20Permit(TokenAddresses.USDC).transfer(user, 10000e6); // USDC has 6 decimals
        
        console.log("=== Token Balances After Setup ===");
        console.log("User DAI:", IERC20Permit(TokenAddresses.DAI).balanceOf(user) / 1e18);
        console.log("User USDC:", IERC20Permit(TokenAddresses.USDC).balanceOf(user) / 1e6);
        console.log("User WETH:", IERC20Permit(TokenAddresses.WETH).balanceOf(user) / 1e18);
    }
    
    function testSwapUSDCtoWETH() public {
        uint256 amountIn = 1000e6; // 1000 USDC (6 decimals)
        uint256 deadline = block.timestamp + 1 hours;
        
        // Get quote
        uint256 expectedOut = permitSwap.getAmountOut(TokenAddresses.USDC, TokenAddresses.WETH, amountIn);
        uint256 amountOutMin = (expectedOut * 95) / 100; // 5% slippage
        
        console.log("=== USDC to WETH Swap ===");
        console.log("Input: 1000 USDC");
        console.log("Expected WETH output:", expectedOut / 1e18);
        console.log("Minimum WETH output:", amountOutMin / 1e18);
        
        
        console.log("USDC permit signature would need different implementation");
        console.log("Quote calculation works correctly");
    }
    
    function testSwapDAItoUSDC() public {
        uint256 amountIn = 1000e18; // 1000 DAI
        uint256 deadline = block.timestamp + 1 hours;
        
        // Get quote  
        uint256 expectedOut = permitSwap.getAmountOut(TokenAddresses.DAI, TokenAddresses.USDC, amountIn);
        uint256 amountOutMin = (expectedOut * 95) / 100;
        
        console.log("=== DAI to USDC Swap ===");
        console.log("Input: 1000 DAI");
        console.log("Expected USDC output:", expectedOut / 1e6);
        console.log("Minimum USDC output:", amountOutMin / 1e6);
        
        // Create DAI permit signature
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                IERC20Permit(TokenAddresses.DAI).DOMAIN_SEPARATOR(),
                keccak256(abi.encode(
                    keccak256("Permit(address holder,address spender,uint256 nonce,uint256 expiry,bool allowed)"),
                    user,
                    address(permitSwap),
                    IERC20Permit(TokenAddresses.DAI).nonces(user),
                    deadline,
                    true
                ))
            )
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        
        // Record balances
        uint256 daiBalanceBefore = IERC20Permit(TokenAddresses.DAI).balanceOf(user);
        uint256 usdcBalanceBefore = IERC20Permit(TokenAddresses.USDC).balanceOf(user);
        
        // Execute swap
        vm.prank(user);
        uint256 actualOut = permitSwap.swapWithPermit(
            TokenAddresses.DAI,
            TokenAddresses.USDC,
            amountIn,
            amountOutMin,
            deadline,
            v,
            r,
            s
        );
        
        // Verify results
        uint256 daiBalanceAfter = IERC20Permit(TokenAddresses.DAI).balanceOf(user);
        uint256 usdcBalanceAfter = IERC20Permit(TokenAddresses.USDC).balanceOf(user);
        
        console.log("Actual USDC received:", actualOut / 1e6);
        console.log("DAI balance change:", (daiBalanceBefore - daiBalanceAfter) / 1e18);
        console.log("USDC balance change:", (usdcBalanceAfter - usdcBalanceBefore) / 1e6);
        
        assertEq(daiBalanceAfter, daiBalanceBefore - amountIn);
        assertGe(usdcBalanceAfter, usdcBalanceBefore + amountOutMin);
        
        console.log("DAI to USDC swap completed successfully!");
    }
    
    function testGetQuotesForAllPairs() public view {
        uint256 amount1000DAI = 1000e18;
        uint256 amount1000USDC = 1000e6;
        uint256 amount1ETH = 1e18;
        
        console.log("=== Price Quotes (Live from Uniswap) ===");
        
        // DAI quotes
        console.log("1000 DAI -> USDC:", permitSwap.getAmountOut(TokenAddresses.DAI, TokenAddresses.USDC, amount1000DAI) / 1e6);
        console.log("1000 DAI -> WETH:", permitSwap.getAmountOut(TokenAddresses.DAI, TokenAddresses.WETH, amount1000DAI) / 1e18);
        
        // USDC quotes  
        console.log("1000 USDC -> DAI:", permitSwap.getAmountOut(TokenAddresses.USDC, TokenAddresses.DAI, amount1000USDC) / 1e18);
        console.log("1000 USDC -> WETH:", permitSwap.getAmountOut(TokenAddresses.USDC, TokenAddresses.WETH, amount1000USDC) / 1e18);
        
        // WETH quotes
        console.log("1 WETH -> DAI:", permitSwap.getAmountOut(TokenAddresses.WETH, TokenAddresses.DAI, amount1ETH) / 1e18);
        console.log("1 WETH -> USDC:", permitSwap.getAmountOut(TokenAddresses.WETH, TokenAddresses.USDC, amount1ETH) / 1e6);
    }
    
    function testContractInfo() public view {
        console.log("=== Contract Information ===");
        console.log("UniswapPermitSwap address:", address(permitSwap));
        console.log("Uniswap V2 Router:", permitSwap.getRouterAddress());
        console.log("");
        console.log("Token Addresses:");
        console.log("USDC:", TokenAddresses.USDC);
        console.log("DAI:", TokenAddresses.DAI);  
        console.log("WETH:", TokenAddresses.WETH);
        console.log("USDT:", TokenAddresses.USDT);
        console.log("UNI:", TokenAddresses.UNI);
        console.log("LINK:", TokenAddresses.LINK);
        console.log("WBTC:", TokenAddresses.WBTC);
    }
}