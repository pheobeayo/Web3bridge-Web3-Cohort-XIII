import { BaseError, ContractFunctionRevertedError } from "viem";
import { publicClient, getWagmiWalletClient } from "@/lib/viem";
import { useAccount, useSwitchChain } from "wagmi";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHAIN_IDS } from "@/lib/chain-utils";
import contracts from "@/contracts/contracts";
import { ExternalLink, Unplug } from "lucide-react";
import toast from "react-hot-toast";
import { celoAlfajores } from "viem/chains";
// import { config } from "@/lib/config";

type ENSRegisterProps = {
  name: string;
};

export function ENSRegister({ name: nametoReg }: ENSRegisterProps) {
  const { address, chainId } = useAccount();
  // const { writeContract } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const [file, setFile] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [userChoosenName, setUserChoosenName] = useState<string>(nametoReg);
  const [resolverAddr, setResolverAddress] = useState<string | undefined>(
    address,
  );

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
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

    console.log("Will use pinata to pin file: ", file);
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
        functionName: "registerName",
        chain: celoAlfajores,
        args: [
          userChoosenName,
          resolverAddr as string,
          resolverAddr as `0x${string}`,
        ],
      });

      const txHash = await walletClient.writeContract(request);
      setHash(txHash);
      setSuccess(`${userChoosenName} registered successfully!`);
      toast.success(`${userChoosenName} registered successfully!`, {
        className: "toast-success",
      });
    } catch (err) {
      console.error("Registration error:", err);

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
          toast.error(`Registration failed: ${errorName}`, {
            className: "toast-error",
          });
          setErro(`Registration failed: ${errorName}`);
        } else {
          console.log("Error: ", err);
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
            toast.error(`Registration failed: ${errorMessage}`, {
              className: "toast-success",
            });
            setErro(`Registration failed: ${errorMessage}`);
          }
        }
      } else {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        toast.error(`Registration failed: ${errorMessage}`, {
          className: "toast-success",
        });
        setErro(`Registration failed: ${errorMessage}`);
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
          Please connect your wallet to register an ENS name.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleRegister}>
      <div className="mb-4 w-full md:min-w-4xl mx-auto flex items-center justify-center flex-col md:flex-row gap-4">
        {/* ENS Name */}
        <div className="w-full md:w-auto">
          <Label htmlFor="ens-name" className="p-2">
            ENS Name
          </Label>
          <Input
            id="ens-name"
            name="ens-name"
            type="text"
            // disabled
            value={userChoosenName}
            onChange={(e) => setUserChoosenName(e.target.value)}
            className="h-12 border-1 border-gray-200/20"
          />
        </div>

        {/* Resolver Address */}
        <div className="w-full md:w-auto">
          <Label htmlFor="resolver-address" className="p-2">
            Resolver Address (Optional)
          </Label>
          <Input
            id="resolver-address"
            name="resolver-address"
            type="text"
            placeholder="0x..."
            className="h-12"
            value={resolverAddr}
            onChange={(e) => setResolverAddress(e.target.value)}
          />
        </div>

        {/* File Upload */}
        <div className="w-full md:w-auto">
          <Label htmlFor="file-upload" className="p-2">
            Upload File (Optional)
          </Label>
          <Input
            id="file-upload"
            name="file-upload"
            type="file"
            className="h-12"
            onChange={(e) => {
              const uploadedFile = e.target.files?.[0] || null;
              setFile(uploadedFile);
            }}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending}
          className="h-12 w-full md:w-auto md:mt-7"
        >
          {isPending ? "Registering..." : "Register Name"}
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
