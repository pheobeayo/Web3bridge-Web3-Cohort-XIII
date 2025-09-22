// src/lib/viem.ts
import { celoAlfajores } from "viem/chains";
import { createPublicClient, http } from "viem";
import { getWalletClient } from "@wagmi/core";
import { wagmiConfig } from "./wagmi";

export const publicClient = createPublicClient({
  chain: celoAlfajores,
  transport: http(),
});

// Returns the connected Wagmi Wallet Client or null if not available
export async function getWagmiWalletClient() {
  try {
    const client = await getWalletClient(wagmiConfig);
    return client ?? null;
  } catch {
    return null;
  }
}