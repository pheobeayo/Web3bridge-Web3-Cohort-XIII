// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/UniswapPermitSwap.sol";
import "../src/TokenAddresses.sol";
import "../src/interfaces/IUniSwapV2Router02.sol";
import "../src/interfaces/IERC20Permit.sol";

contract UniswapPermitSwapTest is Test {
    UniswapPermitSwap permitSwap;
    
    
    address constant USDC = TokenAddresses.USDC;
    address constant WETH = TokenAddresses.WETH; 
    address constant DAI = TokenAddresses.DAI;
    
    
    IERC20Permit constant dai = IERC20Permit(DAI);
    IERC20Permit constant weth = IERC20Permit(WETH);
    
    // Test user
    address user = address(0x1234);
    uint256 userPrivateKey = 0x1234;
    
    // DAI whale for funding (Maker Protocol)
    address daiWhale = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
    
    function setUp() public {
        // Fork mainnet
        vm.createFork(vm.envString("MAINNET_RPC_URL"));
        
        // Deploy permit swap contract
        permitSwap = new UniswapPermitSwap();
        
        // Fund user with DAI from whale
        vm.prank(daiWhale);
        dai.transfer(user, 10000e18); // 10,000 DAI
        
        console.log("Setup complete");
        console.log("User DAI balance:", dai.balanceOf(user) / 1e18);
        console.log("User WETH balance:", weth.balanceOf(user) / 1e18);
    }
    
    function testPermitSwapDAItoWETH() public {
        uint256 amountIn = 1000e18; // 1000 DAI
        uint256 deadline = block.timestamp + 1 hours;
        
        _executePermitSwapTest(amountIn, deadline, user);
        
        console.log("Permit + Swap completed successfully!");
    }
    
    function testPermitSwapWithRelayer() public {
        uint256 amountIn = 500e18; // 500 DAI
        uint256 deadline = block.timestamp + 1 hours;
        address relayer = address(0x5678);
        
        _executePermitSwapOnBehalfTest(amountIn, deadline, relayer);
        
        console.log("Relayer-submitted permit + swap completed successfully!");
    }
    
    function testGetAmountOut() public view {
        uint256 amountIn = 1000e18; // 1000 DAI
        
        uint256 expectedWETH = permitSwap.getAmountOut(DAI, WETH, amountIn);
        
        console.log("1000 DAI should get approximately", expectedWETH / 1e18, "WETH");
        
        assertGt(expectedWETH, 0);
    }
    
    function testInvalidPermit() public {
        uint256 amountIn = 1000e18;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 amountOutMin = 1e17; // 0.1 WETH
        
        _testInvalidPermitSignature(amountIn, amountOutMin, deadline);
        
        console.log("Invalid signature properly rejected");
    }
    
    // Helper function to execute permit swap test
    function _executePermitSwapTest(uint256 amountIn, uint256 deadline, address executor) internal {
        // Get expected output amount
        uint256 expectedOut = permitSwap.getAmountOut(DAI, WETH, amountIn);
        uint256 amountOutMin = (expectedOut * 95) / 100; // 5% slippage tolerance
        
        console.log("Expected WETH output:", expectedOut / 1e18);
        console.log("Minimum WETH output:", amountOutMin / 1e18);
        
        _executeSwapWithSignature(amountIn, amountOutMin, deadline, executor);
    }
    
    // Helper function to execute permit swap on behalf test
    function _executePermitSwapOnBehalfTest(uint256 amountIn, uint256 deadline, address relayer) internal {
        // Get expected output
        uint256 expectedOut = permitSwap.getAmountOut(DAI, WETH, amountIn);
        uint256 amountOutMin = (expectedOut * 95) / 100;
        
        _executeSwapOnBehalfWithSignature(amountIn, amountOutMin, deadline, relayer);
    }
    
    // Helper function to execute swap with signature
    function _executeSwapWithSignature(uint256 amountIn, uint256 amountOutMin, uint256 deadline, address executor) internal {
        // Create permit signature for DAI
        bytes32 digest = _createPermitDigest(user, address(permitSwap), deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        
        // Record balances before
        uint256 userDAIBefore = dai.balanceOf(user);
        uint256 userWETHBefore = weth.balanceOf(user);
        
        console.log("Before swap:");
        console.log("User DAI:", userDAIBefore / 1e18);
        console.log("User WETH:", userWETHBefore / 1e18);
        
        // Execute permit + swap
        vm.prank(executor);
        uint256 actualOut = permitSwap.swapWithPermit(
            DAI,
            WETH,
            amountIn,
            amountOutMin,
            deadline,
            v,
            r,
            s
        );
        
        // Check results
        _verifySwapResults(userDAIBefore, userWETHBefore, amountIn, amountOutMin, actualOut);
    }
    
    // Helper function to execute swap on behalf with signature
    function _executeSwapOnBehalfWithSignature(uint256 amountIn, uint256 amountOutMin, uint256 deadline, address relayer) internal {
        // User creates permit signature offline
        bytes32 digest = _createPermitDigest(user, address(permitSwap), deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        
        uint256 userDAIBefore = dai.balanceOf(user);
        uint256 userWETHBefore = weth.balanceOf(user);
        
        console.log("Before relayer swap:");
        console.log("User DAI:", userDAIBefore / 1e18);
        console.log("User WETH:", userWETHBefore / 1e18);
        
        // Relayer submits transaction (gasless for user!)
        vm.prank(relayer);
        uint256 actualOut = permitSwap.swapWithPermitOnBehalf(
            user,
            DAI,
            WETH,
            amountIn,
            amountOutMin,
            deadline,
            v,
            r,
            s
        );
        
        _verifySwapResults(userDAIBefore, userWETHBefore, amountIn, amountOutMin, actualOut);
    }
    
    // Helper function to test invalid permit signature
    function _testInvalidPermitSignature(uint256 amountIn, uint256 amountOutMin, uint256 deadline) internal {
        // Create invalid signature (wrong private key)
        bytes32 digest = _createPermitDigest(user, address(permitSwap), deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0x9999, digest); // Wrong key
        
        vm.prank(user);
        vm.expectRevert();
        permitSwap.swapWithPermit(
            DAI,
            WETH,
            amountIn,
            amountOutMin,
            deadline,
            v,
            r,
            s
        );
    }
    
    // Helper function to create permit digest (reduces stack depth in main functions)
    function _createPermitDigest(
        address holder,
        address spender,
        uint256 deadline
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                dai.DOMAIN_SEPARATOR(),
                keccak256(abi.encode(
                    // DAI permit typehash
                    keccak256("Permit(address holder,address spender,uint256 nonce,uint256 expiry,bool allowed)"),
                    holder,
                    spender,
                    dai.nonces(holder),
                    deadline,
                    true
                ))
            )
        );
    }
    
    // Helper function to verify swap results (reduces stack depth in main functions)
    function _verifySwapResults(
        uint256 userDAIBefore,
        uint256 userWETHBefore,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 actualOut
    ) internal view {
        uint256 userDAIAfter = dai.balanceOf(user);
        uint256 userWETHAfter = weth.balanceOf(user);
        
        console.log("After swap:");
        console.log("User DAI:", userDAIAfter / 1e18);
        console.log("User WETH:", userWETHAfter / 1e18);
        console.log("Actual WETH received:", actualOut / 1e18);
        
        // Assertions
        assertEq(userDAIAfter, userDAIBefore - amountIn);
        assertGe(userWETHAfter, userWETHBefore + amountOutMin);
        assertEq(actualOut, userWETHAfter - userWETHBefore);
    }
}