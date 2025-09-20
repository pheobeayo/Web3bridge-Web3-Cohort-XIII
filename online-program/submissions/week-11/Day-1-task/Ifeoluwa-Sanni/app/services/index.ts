import { Contract, ethers } from "ethers";
import { ENSContract } from "./contract";
import { rpcUrl } from "../config/web3.config";

declare global {
    interface Window {
      ethereum?: any;
    }
  }
  
const ethereumProvider = typeof window !== "undefined" ? window.ethereum : null;

export async function ensureEthereumAvailable(): Promise<void> {
    if (!ethereumProvider) {
      throw new Error(
        "No Ethereum provider found. Please install an EVM wallet (e.g., MetaMask)."
      );
    }
  
    // Type guard to check if the provider has a request method
    if (!ethereumProvider || typeof ethereumProvider !== 'object' || !('request' in ethereumProvider) || typeof ethereumProvider.request !== "function") {
      throw new Error(
        "Ethereum provider does not support 'request' method. Ensure MetaMask is up to date."
      );
    }
}

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export async function getSigner(): Promise<ethers.Signer> {
    await ensureEthereumAvailable();
  
    try {
      const provider = ethereumProvider as EthereumProvider;
      const accounts = await provider.request({
        method: "eth_accounts",
      }) as string[];
  
      if (accounts?.length > 0) {
        const ethProvider = new ethers.BrowserProvider(
          ethereumProvider as ethers.Eip1193Provider
        );
  
        return ethProvider.getSigner();
      } else {
        const fallbackProvider = new ethers.JsonRpcProvider(rpcUrl);
        const randomWallet = ethers.Wallet.createRandom();
  
        return randomWallet.connect(fallbackProvider);
      }
    } catch (error) {
      console.error("Error getting signer:", error);
      throw new Error("Failed to retrieve a signer.");
    }
}

export async function getENSContract(): Promise<Contract> {
    await ensureEthereumAvailable();
  
    try {
      const signer = await getSigner();
  
      return new ethers.Contract(
        ENSContract.contractAddr,
        ENSContract.contractABI,
        signer
      );
    } catch (error) {
      console.error("Error initializing contract:", error);
      throw new Error("Failed to initialize the ENS contract.");
    }
}