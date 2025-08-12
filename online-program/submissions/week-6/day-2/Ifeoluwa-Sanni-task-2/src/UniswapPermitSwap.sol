// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/IUniSwapV2Router02.sol"; 
import "./interfaces/IERC20Permit.sol";
import "./TokenAddresses.sol";

contract UniswapPermitSwap {
    IUniswapV2Router02 public immutable uniswapRouter;
    
    // Struct to handle permit parameters and reduce stack depth
    struct PermitParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    
    event PermitSwap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    constructor() {
        uniswapRouter = IUniswapV2Router02(TokenAddresses.UNISWAP_V2_ROUTER);
    }
    
    function swapWithPermit(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountOut) {
        PermitParams memory params = PermitParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOutMin: amountOutMin,
            deadline: deadline,
            v: v,
            r: r,
            s: s
        });
        
        return _swapWithPermit(msg.sender, params);
    }
    
    function swapWithPermitOnBehalf(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountOut) {
        PermitParams memory params = PermitParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOutMin: amountOutMin,
            deadline: deadline,
            v: v,
            r: r,
            s: s
        });
        
        return _swapWithPermit(user, params);
    }
    
    function _swapWithPermit(
        address user,
        PermitParams memory params
    ) internal returns (uint256 amountOut) {
        IERC20Permit token = IERC20Permit(params.tokenIn);
        
        // Use permit to approve this contract to spend user's tokens
        token.permit(user, address(this), params.amountIn, params.deadline, params.v, params.r, params.s);
        
        // Transfer tokens from user to this contract
        token.transferFrom(user, address(this), params.amountIn);
        
        // Approve Uniswap router to spend tokens
        token.approve(address(uniswapRouter), params.amountIn);
        
        // Execute swap and return amount out
        amountOut = _executeSwap(user, params);
        
        emit PermitSwap(user, params.tokenIn, params.tokenOut, params.amountIn, amountOut);
    }
    
    function _executeSwap(
        address user,
        PermitParams memory params
    ) internal returns (uint256 amountOut) {
        // Setup swap path
        address[] memory path = new address[](2);
        path[0] = params.tokenIn;
        path[1] = params.tokenOut;
        
        // Execute swap
        uint[] memory amounts = uniswapRouter.swapExactTokensForTokens(
            params.amountIn,
            params.amountOutMin,
            path,
            user, // Send output tokens directly to user
            params.deadline
        );
        
        amountOut = amounts[1];
    }
    
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = uniswapRouter.getAmountsOut(amountIn, path);
        amountOut = amounts[1];
    }
    
    function getRouterAddress() external view returns (address) {
        return address(uniswapRouter);
    }
}