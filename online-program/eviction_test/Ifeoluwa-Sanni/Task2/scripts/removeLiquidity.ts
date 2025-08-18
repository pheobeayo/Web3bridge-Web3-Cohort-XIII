import { ethers, Contract, Signer } from 'ethers';
import { BigNumber } from 'ethers/lib./utils';

// Interface definitions
interface RemoveLiquidityParams {
  tokenA: string;
  tokenB: string;
  liquidityAmount: BigNumber;
  amountAMin: BigNumber;
  amountBMin: BigNumber;
  deadline: number;
}

interface RemoveLiquidityETHParams {
  token: string;
  liquidityAmount: BigNumber;
  amountTokenMin: BigNumber;
  amountETHMin: BigNumber;
  deadline: number;
}

interface RemoveLiquidityResult {
  amountA: BigNumber;
  amountB: BigNumber;
}

interface RemoveLiquidityETHResult {
  amountToken: BigNumber;
  amountETH: BigNumber;
}

interface PairReserves {
  reserve0: BigNumber;
  reserve1: BigNumber;
}

// ABI definitions (simplified for key functions)
const UNISWAP_V2_ROUTER_ABI = [
  'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)',
  'function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)',
  'function factory() external pure returns (address)',
  'function WETH() external pure returns (address)'
];

const UNISWAP_V2_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];



const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)'
];

const LIQUIDITY_REMOVER_ABI = [
  'function removeLiquidity(address tokenA, address tokenB, uint256 liquidityAmount, uint256 amountAMin, uint256 amountBMin, uint256 deadline) external returns (uint256 amountA, uint256 amountB)',
  'function removeLiquidityETH(address token, uint256 liquidityAmount, uint256 amountTokenMin, uint256 amountETHMin, uint256 deadline) external returns (uint256 amountToken, uint256 amountETH)',
  'function getLPTokenBalance(address tokenA, address tokenB, address user) external view returns (uint256)',
  'function getPairReserves(address tokenA, address tokenB) external view returns (uint112 reserve0, uint112 reserve1)',
  'function calculateRemoveAmounts(address tokenA, address tokenB, uint256 liquidityAmount) external view returns (uint256 amountA, uint256 amountB)',
  'event LiquidityRemoved(address indexed tokenA, address indexed tokenB, uint256 liquidityAmount, uint256 amountA, uint256 amountB)',
  'event LiquidityRemovedETH(address indexed token, uint256 liquidityAmount, uint256 amountToken, uint256 amountETH)'
];

export class LiquidityRemover {
  private contract: Contract;
  private routerContract: Contract;
  private factoryContract: Contract | undefined;
  private signer: Signer;
  
  // Mainnet Uniswap V2 Router address
  private static readonly ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
  
  constructor(contractAddress: string, signer: Signer) {
    this.signer = signer;
    this.contract = new Contract(contractAddress, LIQUIDITY_REMOVER_ABI, signer);
    this.routerContract = new Contract(LiquidityRemover.ROUTER_ADDRESS, UNISWAP_V2_ROUTER_ABI, signer);
    
    // Get factory address and create factory contract
    this.initializeFactory();
  }
  
  private async initializeFactory(): Promise<void> {
    const factoryAddress = await this.routerContract.factory();
    this.factoryContract = new Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, this.signer);
  }
  
  
  async removeLiquidity(params: RemoveLiquidityParams): Promise<RemoveLiquidityResult> {
    try {
      const tx = await this.contract.removeLiquidity(
        params.tokenA,
        params.tokenB,
        params.liquidityAmount,
        params.amountAMin,
        params.amountBMin,
        params.deadline
      );
      
      const receipt = await tx.wait();
      
      // Parse the event to get actual amounts
      const event = receipt.events?.find((e: any) => e.event === 'LiquidityRemoved');
      if (event) {
        return {
          amountA: event.args.amountA,
          amountB: event.args.amountB
        };
      }
      
      throw new Error('LiquidityRemoved event not found in transaction receipt');
    } catch (error) {
      throw new Error(`Failed to remove liquidity: ${error}`);
    }
  }
  
  
  async removeLiquidityETH(params: RemoveLiquidityETHParams): Promise<RemoveLiquidityETHResult> {
    try {
      const tx = await this.contract.removeLiquidityETH(
        params.token,
        params.liquidityAmount,
        params.amountTokenMin,
        params.amountETHMin,
        params.deadline
      );
      
      const receipt = await tx.wait();
      
      // Parse the event to get actual amounts
      const event = receipt.events?.find((e: any) => e.event === 'LiquidityRemovedETH');
      if (event) {
        return {
          amountToken: event.args.amountToken,
          amountETH: event.args.amountETH
        };
      }
      
      throw new Error('LiquidityRemovedETH event not found in transaction receipt');
    } catch (error) {
      throw new Error(`Failed to remove liquidity ETH: ${error}`);
    }
  }
  
  
  async getLPTokenBalance(tokenA: string, tokenB: string, user: string): Promise<BigNumber> {
    try {
      return await this.contract.getLPTokenBalance(tokenA, tokenB, user);
    } catch (error) {
      throw new Error(`Failed to get LP token balance: ${error}`);
    }
  }

  async getPairReserves(tokenA: string, tokenB: string): Promise<PairReserves> {
    try {
      const [reserve0, reserve1] = await this.contract.getPairReserves(tokenA, tokenB);
      return { reserve0, reserve1 };
    } catch (error) {
      throw new Error(`Failed to get pair reserves: ${error}`);
    }
  }
  
  
  async calculateRemoveAmounts(
    tokenA: string, 
    tokenB: string, 
    liquidityAmount: BigNumber
  ): Promise<RemoveLiquidityResult> {
    try {
      const [amountA, amountB] = await this.contract.calculateRemoveAmounts(
        tokenA, 
        tokenB, 
        liquidityAmount
      );
      return { amountA, amountB };
    } catch (error) {
      throw new Error(`Failed to calculate remove amounts: ${error}`);
    }
  }
  
  
  async getPairAddress(tokenA: string, tokenB: string): Promise<string> {
    try {
      if (!this.factoryContract) {
        await this.initializeFactory();
      }
      return await this.factoryContract.getPair(tokenA, tokenB);
    } catch (error) {
      throw new Error(`Failed to get pair address: ${error}`);
    }
  }
  
  
  async checkLPTokenApproval(
    tokenA: string, 
    tokenB: string, 
    userAddress: string, 
    amount: BigNumber
  ): Promise<boolean> {
    try {
      const pairAddress = await this.getPairAddress(tokenA, tokenB);
      if (pairAddress === ethers.constants.AddressZero) {
        return false;
      }
      
      const lpToken = new Contract(pairAddress, ERC20_ABI, this.signer);
      const allowance = await lpToken.allowance(userAddress, this.contract.address);
      
      return allowance.gte(amount);
    } catch (error) {
      throw new Error(`Failed to check LP token approval: ${error}`);
    }
  }
  

  async approveLPTokens(
    tokenA: string, 
    tokenB: string, 
    amount: BigNumber
  ): Promise<void> {
    try {
      const pairAddress = await this.getPairAddress(tokenA, tokenB);
      if (pairAddress === ethers.constants.AddressZero) {
        throw new Error('Pair does not exist');
      }
      
      const lpToken = new Contract(pairAddress, ERC20_ABI, this.signer);
      const tx = await lpToken.approve(this.contract.address, amount);
      await tx.wait();
    } catch (error) {
      throw new Error(`Failed to approve LP tokens: ${error}`);
    }
  }
  
  
  static getDeadline(bufferMinutes: number = 10): number {
    return Math.floor(Date.now() / 1000) + (bufferMinutes * 60);
  }

  static parseAmount(amount: string, decimals: number = 18): BigNumber {
    return ethers.utils.parseUnits(amount, decimals);
  }
  
  /**
   * Convert BigNumber to string with decimals
   */
  static formatAmount(amount: BigNumber, decimals: number = 18): string {
    return ethers.utils.formatUnits(amount, decimals);
  }
}

export type {
  RemoveLiquidityParams,
  RemoveLiquidityETHParams,
  RemoveLiquidityResult,
  RemoveLiquidityETHResult,
  PairReserves
};

