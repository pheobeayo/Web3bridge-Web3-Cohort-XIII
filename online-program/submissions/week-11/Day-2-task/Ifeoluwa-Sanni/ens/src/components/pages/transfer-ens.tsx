import { BaseError, ContractFunctionRevertedError } from "viem";
import { publicClient, getWagmiWalletClient } from "@/lib/viem";
import { useAccount, useSwitchChain } from "wagmi";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHAIN_IDS } from "@/lib/chain-utils";
import { truncateAddress } from "@/lib/utils";
import contracts from "@/contracts/contracts";
import { ExternalLink, Unplug } from "lucide-react";
import toast from "react-hot-toast";

export function ENSTransfer() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [erro, setErro] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [newOwner, setNewOwner] = useState<string | undefined>(address);

  async function handleTransfer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (chainId !== CHAIN_IDS.CELO_ALFAJORES) {
      try {
        await switchChainAsync({ chainId: CHAIN_IDS.CELO_ALFAJORES });
        console.log("Switched to Celo Alfajores!");
      } catch (err) {
        toast.error(`Failed to switch network. ${err}`, {
          className: "toast-error",
        });
        return;
      }
    }

    setErro(null);
    setSuccess(null);
    setIsPending(true);
    setHash(null);

    try {
      const walletClient = await getWagmiWalletClient();
      if (!walletClient) {
        toast.error("No connected wallet found. Please connect your wallet.", {
          className: "toast-error",
        });
        setErro("No connected wallet found.");
        setIsPending(false);
        return;
      }

      const { request } = await publicClient.simulateContract({
        account: walletClient.account,
        address: contracts.ENS.address,
        abi: contracts.ENS.abi,
        functionName: "transferName",
        args: [name, newOwner as `0x${string}`],
      });

      const txHash = await walletClient.writeContract(request);
      setHash(txHash);
      setSuccess(`${name} tranfered to ${truncateAddress(newOwner)}`);
      toast.success(`${name} tranfered to ${truncateAddress(newOwner)}`, {
        className: "toast-success",
      });
    } catch (err) {
      console.error("Name Transfer error:", err);

      if (err instanceof BaseError && err.message.includes("User rejected")) {
        toast.error("Transaction cancelled by user", {
          className: "toast-error",
        });
        setErro("Transaction was cancelled");
        return;
      }

      if (err instanceof BaseError) {
        const revertError = err.walk(
          (err) => err instanceof ContractFunctionRevertedError,
        );
        if (revertError instanceof ContractFunctionRevertedError) {
          const errorName = revertError.reason ?? "Unknown Error Occurred";
          toast.error(`Name Transfer failed: ${errorName}`, {
            className: "toast-error",
          });
          setErro(`Name Transfer failed: ${errorName}`);
        } else {
          // Handle chain mismatch errors specifically
          if (err.message.includes("chain") || err.message.includes("Chain")) {
            toast.error(
              "Chain mismatch error. Please ensure you're on Celo Alfajores network.",
              {
                className: "toast-success",
              },
            );
            setErro(
              "Chain mismatch error. Please switch to Celo Alfajores network and try again.",
            );
          } else {
            const errorMessage =
              err.shortMessage || err.message || "Unknown error occurred";
            toast.error(`Name Transfer failed: ${errorMessage}`, {
              className: "toast-success",
            });
            setErro(`Name Transfer failed: ${errorMessage}`);
          }
        }
      } else {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        toast.error(`Name Transfer failed: ${errorMessage}`, {
          className: "toast-success",
        });
        setErro(`Name Transfer failed: ${errorMessage}`);
      }
    } finally {
      setIsPending(false);
    }
  }

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-16 px-4 sm:px-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Unplug className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
          Connect Your Wallet
        </h3>
        <p className="text-muted-foreground text-center text-sm sm:text-base max-w-xs sm:max-w-sm">
          Please connect your wallet to Transfer ENS name.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleTransfer}>
      <div className="mb-4 w-full md:min-w-4xl mx-auto flex items-center justify-center flex-col gap-4">
        <div className="w-full">
          {/* ENS Name */}
          <div className="w-full md:w-auto">
            <Label htmlFor="ens-name" className="p-2">
              ENS Name
            </Label>
            <Input
              id="ens-name"
              required
              name="ens-name"
              type="text"
              // disabled
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
            />
          </div>

          {/* Resolver Address */}
          <div className="w-full md:w-auto mt-4">
            <Label htmlFor="resolver-address" className="p-2">
              New Owner
            </Label>
            <Input
              id="resolver-address"
              name="resolver-address"
              type="text"
              placeholder="0x..."
              className="h-12"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full md:w-1/3 md:mt-5"
        >
          {isPending ? "Transfering..." : "Transfer Name"}
        </Button>
      </div>

      {/* Transaction Hash */}
      {hash && (
        <p className="text-sm mt-2">
          <a
            href={`https://alfajores.celoscan.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View transaction on Celoscan
          </a>
        </p>
      )}

      {/* Feedback */}
      {erro && <p className="text-red-600 text-sm mt-2">{erro}</p>}
      {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
    </form>
  );
}
