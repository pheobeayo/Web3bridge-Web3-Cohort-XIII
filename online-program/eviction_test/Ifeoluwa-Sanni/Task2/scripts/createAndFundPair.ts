import { ethers, Contract, Signer, BigNumber } from 'ethers';

// Interface definitions
interface CreatePairParams {
  tokenA: string;
  tokenB: string;
}

interface AddLiquidityParams {
  tokenA: string;
  tokenB: string;
  amountADesired: BigNumber;
  amountBDesired: BigNumber;
  amountAMin: BigNumber;
  amountBMin: BigNumber;
  deadline: number;
}

interface AddLiquidityETHParams {
  token: string;
  amountTokenDesired: BigNumber;
  amountTokenMin: BigNumber;
  amountETHMin: BigNumber;
  deadline: number;
  ethValue: BigNumber;
}

interface CreateAndFundParams extends AddLiquidityParams {
  createPair: boolean;
}

interface CreateAndFundETHParams extends AddLiquidityETHParams {
  createPair: boolean;
}

interface LiquidityResult {
  amountA: BigNumber;
  amountB: BigNumber;
  liquidity: BigNumber;
  pairAddress: string;
}

interface LiquidityETHResult {
  amountToken: BigNumber;
  amountETH: BigNumber;
  liquidity: BigNumber;
  pairAddress: string;
}

interface PairInfo {
  pairAddress: string;
  token0: string;
  token1: string;
  reserve0: BigNumber;
  reserve1: BigNumber;
  totalSupply: BigNumber;
  exists: boolean;
}

// ABI definitions
const UNISWAP_V2_ROUTER_ABI = [
  'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
  'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)',
  'function factory() external pure returns (address)',
  'function WETH() external pure returns (address)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)'
];

const UNISWAP_V2_FACTORY_ABI = [
  'function createPair(address tokenA, address tokenB) external returns (address pair)',
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
  'function allPairsLength() external view returns (uint)',
  'function feeTo() external view returns (address)',
  'function feeToSetter() external view returns (address)'
];

const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function totalSupply() external view returns (uint)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function balanceOf(address account) external view returns (uint256)',
  'function kLast() external view returns (uint)'
];

const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)'
];

const CREATE_AND_FUND_PAIR_ABI = [
  'function createAndFundPair(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, uint256 deadline, bool createPair) external returns (uint256 amountA, uint256 amountB, uint256 liquidity, address pairAddress)',
  'function createAndFundPairETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, uint256 deadline, bool createPair) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity, address pairAddress)',
  'function createPair(address tokenA, address tokenB) external returns (address pairAddress)',
  'function getPairInfo(address tokenA, address tokenB) external view returns (address pairAddress, address token0, address token1, uint112 reserve0, uint112 reserve1, uint256 totalSupply, bool exists)',
  'function calculateOptimalAmounts(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired) external view returns (uint256 amountA, uint256 amountB)',
  'function estimateGasForPairCreation(address tokenA, address tokenB) external view returns (uint256)',
  'event PairCreated(address indexed tokenA, address indexed tokenB, address pairAddress)',
  'event LiquidityAdded(address indexed tokenA, address indexed tokenB, address pairAddress, uint256 amountA, uint256 amountB, uint256 liquidity)',
  'event LiquidityAddedETH(address indexed token, address pairAddress, uint256 amountToken, uint256 amountETH, uint256 liquidity)'
];

export class CreateAndFundPair {
  private contract: Contract;
  private routerContract: Contract;
  private factoryContract: Contract;
  private signer: Signer;
  
  // Mainnet Uniswap V2 Router address
  private static readonly ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
  
  constructor(contractAddress: string, signer: Signer) {
    this.signer = signer;
    this.contract = new Contract(contractAddress, CREATE_AND_FUND_PAIR_ABI, signer);
    this.routerContract = new Contract(CreateAndFundPair.ROUTER_ADDRESS, UNISWAP_V2_ROUTER_ABI, signer);
    
    // Initialize factory contract
    this.initializeFactory();
  }
  
  private async initializeFactory(): Promise<void> {
    const factoryAddress = await this.routerContract.factory();
    this.factoryContract = new Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, this.signer);
  }
  
  /**
   * Create a new pair and add initial liquidity
   */
  async createAndFundPair(params: CreateAndFundParams): Promise<LiquidityResult> {
    try {
      const tx = await this.contract.createAndFundPair(
        params.tokenA,
        params.tokenB,
        params.amountADesired,
        params.amountBDesired,
        params.amountAMin,
        params.amountBMin,
        params.deadline,
        params.createPair
      );
      
      const receipt = await tx.wait();
      
      // Parse events to get results
      const liquidityEvent = receipt.events?.find((e: any) => e.event === 'LiquidityAdded');
      if (liquidityEvent) {
        const pairAddress = liquidityEvent.args.pairAddress;
        return {
          amountA: liquidityEvent.args.amountA,
          amountB: liquidityEvent.args.amountB,
          liquidity: liquidityEvent.args.liquidity,
          pairAddress
        };
      }
      
      throw new Error('LiquidityAdded event not found in transaction receipt');
    } catch (error) {
      throw new Error(`Failed to create and fund pair: ${error}`);
    }
  }
  
  /**
   * Create a new token/ETH pair and add initial liquidity
   */
  async createAndFundPairETH(params: CreateAndFundETHParams): Promise<LiquidityETHResult> {
    try {
      const tx = await this.contract.createAndFundPairETH(
        params.token,
        params.amountTokenDesired,
        params.amountTokenMin,
        params.amountETHMin,
        params.deadline,
        params.createPair,
        { value: params.ethValue }
      );
      
      const receipt = await tx.wait();
      
      // Parse events to get results
      const liquidityEvent = receipt.events?.find((e: any) => e.event === 'LiquidityAddedETH');
      if (liquidityEvent) {
        const pairAddress = liquidityEvent.args.pairAddress;
        return {
          amountToken: liquidityEvent.args.amountToken,
          amountETH: liquidityEvent.args.amountETH,
          liquidity: liquidityEvent.args.liquidity,
          pairAddress
        };
      }
      
      throw new Error('LiquidityAddedETH event not found in transaction receipt');
    } catch (error) {
      throw new Error(`Failed to create and fund pair ETH: ${error}`);
    }
  }
  
  /**
   * Create a new pair without adding liquidity
   */
  async createPair(params: CreatePairParams): Promise<string> {
    try {
      const tx = await this.contract.createPair(params.tokenA, params.tokenB);
      const receipt = await tx.wait();
      
      const pairCreatedEvent = receipt.events?.find((e: any) => e.event === 'PairCreated');
      if (pairCreatedEvent) {
        return pairCreatedEvent.args.pairAddress;
      }
      
      throw new Error('PairCreated event not found in transaction receipt');
    } catch (error) {
      throw new Error(`Failed to create pair: ${error}`);
    }
  }
  
  /**
   * Get comprehensive information about a pair
   */
  async getPairInfo(tokenA: string, tokenB: string): Promise<PairInfo> {
    try {
      const [pairAddress, token0, token1, reserve0, reserve1, totalSupply, exists] = 
        await this.contract.getPairInfo(tokenA, tokenB);
      
      return {
        pairAddress,
        token0,
        token1,
        reserve0,
        reserve1,
        totalSupply,
        exists
      };
    } catch (error) {
      throw new Error(`Failed to get pair info: ${error}`);
    }
  }
  
  /**
   * Calculate optimal amounts for adding liquidity to existing pair
   */
  async calculateOptimalAmounts(
    tokenA: string,
    tokenB: string,
    amountADesired: BigNumber,
    amountBDesired: BigNumber
  ): Promise<{ amountA: BigNumber; amountB: BigNumber }> {
    try {
      const [amountA, amountB] = await this.contract.calculateOptimalAmounts(
        tokenA,
        tokenB,
        amountADesired,
        amountBDesired
      );
      
      return { amountA, amountB };
    } catch (error) {
      throw new Error(`Failed to calculate optimal amounts: ${error}`);
    }
  }
  
  /**
   * Estimate gas cost for creating a new pair
   */
  async estimateGasForPairCreation(tokenA: string, tokenB: string): Promise<BigNumber> {
    try {
      return await this.contract.estimateGasForPairCreation(tokenA, tokenB);
    } catch (error) {
      throw new Error(`Failed to estimate gas for pair creation: ${error}`);
    }
  }
  
  /**
   * Check if a pair already exists
   */
  async pairExists(tokenA: string, tokenB: string): Promise<boolean> {
    try {
      if (!this.factoryContract) {
        await this.initializeFactory();
      }
      
      const pairAddress = await this.factoryContract.getPair(tokenA, tokenB);
      return pairAddress !== ethers.constants.AddressZero;
    } catch (error) {
      throw new Error(`Failed to check if pair exists: ${error}`);
    }
  }
  
  /**
   * Get pair address
   */
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
  
  /**
   * Check token approvals for both tokens
   */
  async checkTokenApprovals(
    tokenA: string,
    tokenB: string,
    userAddress: string,
    amountA: BigNumber,
    amountB: BigNumber
  ): Promise<{ tokenAApproved: boolean; tokenBApproved: boolean }> {
    try {
      const tokenAContract = new Contract(tokenA, ERC20_ABI, this.signer);
      const tokenBContract = new Contract(tokenB, ERC20_ABI, this.signer);
      
      const [allowanceA, allowanceB] = await Promise.all([
        tokenAContract.allowance(userAddress, this.contract.address),
        tokenBContract.allowance(userAddress, this.contract.address)
      ]);
      
      return {
        tokenAApproved: allowanceA.gte(amountA),
        tokenBApproved: allowanceB.gte(amountB)
      };
    } catch (error) {
      throw new Error(`Failed to check token approvals: ${error}`);
    }
  }
  
  /**
   * Approve tokens for the contract
   */
  async approveTokens(
    tokenA: string,
    tokenB: string,
    amountA: BigNumber,
    amountB: BigNumber
  ): Promise<void> {
    try {
      const tokenAContract = new Contract(tokenA, ERC20_ABI, this.signer);
      const tokenBContract = new Contract(tokenB, ERC20_ABI, this.signer);
      
      const approvalPromises: Promise<any>[] = [];
      
      // Check current allowances to avoid unnecessary transactions
      const userAddress = await this.signer.getAddress();
      const [allowanceA, allowanceB] = await Promise.all([
        tokenAContract.allowance(userAddress, this.contract.address),
        tokenBContract.allowance(userAddress, this.contract.address)
      ]);
      
      if (allowanceA.lt(amountA)) {
        approvalPromises.push(tokenAContract.approve(this.contract.address, amountA));
      }
      
      if (allowanceB.lt(amountB)) {
        approvalPromises.push(tokenBContract.approve(this.contract.address, amountB));
      }
      
      if (approvalPromises.length > 0) {
        const txs = await Promise.all(approvalPromises);
        await Promise.all(txs.map(tx => tx.wait()));
      }
    } catch (error) {
      throw new Error(`Failed to approve tokens: ${error}`);
    }
  }
  
  /**
   * Approve single token for the contract
   */
  async approveToken(tokenAddress: string, amount: BigNumber): Promise<void> {
    try {
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, this.signer);
      const tx = await tokenContract.approve(this.contract.address, amount);
      await tx.wait();
    } catch (error) {
      throw new Error(`Failed to approve token: ${error}`);
    }
  }
  
  /**
   * Get token information
   */
  async getTokenInfo(tokenAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    balance: BigNumber;
  }> {
    try {
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, this.signer);
      const userAddress = await this.signer.getAddress();
      
      const [name, symbol, decimals, balance] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.balanceOf(userAddress)
      ]);
      
      return { name, symbol, decimals, balance };
    } catch (error) {
      throw new Error(`Failed to get token info: ${error}`);
    }
  }
  
  /**
   * Get current timestamp + buffer for deadline
   */
  static getDeadline(bufferMinutes: number = 10): number {
    return Math.floor(Date.now() / 1000) + (bufferMinutes * 60);
  }
  
  /**
   * Convert string amount to BigNumber with decimals
   */
  static parseAmount(amount: string, decimals: number = 18): BigNumber {
    return ethers.utils.parseUnits(amount, decimals);
  }
  
  /**
   * Convert BigNumber to string with decimals
   */
  static formatAmount(amount: BigNumber, decimals: number = 18): string {
    return ethers.utils.formatUnits(amount, decimals);
  }
  
  /**
   * Calculate minimum amounts with slippage tolerance
   */
  static calculateMinAmounts(
    amountA: BigNumber,
    amountB: BigNumber,
    slippagePercent: number = 0.5
  ): { amountAMin: BigNumber; amountBMin: BigNumber } {
    const slippageBP = Math.floor(slippagePercent * 100); // Convert to basis points
    const denominator = BigNumber.from(10000);
    const slippageFactor = denominator.sub(slippageBP);
    
    return {
      amountAMin: amountA.mul(slippageFactor).div(denominator),
      amountBMin: amountB.mul(slippageFactor).div(denominator)
    };
  }
}

// Export types for external use
export type {
  CreatePairParams,
  AddLiquidityParams,
  AddLiquidityETHParams,
  CreateAndFundParams,
  CreateAndFundETHParams,
  LiquidityResult,
  LiquidityETHResult,
  PairInfo
};

