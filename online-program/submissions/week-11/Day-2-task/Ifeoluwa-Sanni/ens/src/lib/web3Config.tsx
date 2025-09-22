import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { wagmiConfig } from "./wagmi";
import { queryClient } from "./config";
import { customeTheme } from "@/styles/connectkit-modal-theme";

// Declare wagmi module for type safety
declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

type Web3ProviderProps = {
  children: React.ReactNode;
};

export const Web3Provider = ({ children }: Web3ProviderProps) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider mode="auto" customTheme={customeTheme}>
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
