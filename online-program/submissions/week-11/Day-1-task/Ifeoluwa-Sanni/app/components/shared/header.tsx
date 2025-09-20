"use client"

import { MdOutlineWaterDrop } from "react-icons/md";
import { TbPlugConnectedX } from "react-icons/tb";
import { Loader } from "lucide-react";
import { ConnectKitButton } from "connectkit";

import { useAccount } from "wagmi";
import { web3Config } from "../../config/web3.config";
import Wrapper from "./wrapper";
import Link from "next/link";

export default function Header() {
  const { status } = useAccount({
    config: web3Config,
  });

  return (
    <header className="h-20 w-full sticky z-50 top-0 inset-x-0">
      <Wrapper className="flex items-center px-6 size-full">
        {status === "connected" ? (
          <Link
            href="https://console.optimism.io/faucet"
            target="_blank"
            className="flex items-center gap-2 h-10 px-4 bg-green-500/10 rounded-md text-sm font-medium text-primary cursor-pointer"
          >
            <MdOutlineWaterDrop className="size-5 cursor-pointer text-muted-foreground" />
            <span className="hidden sm:block text-muted-foreground">
              Lisk Sepolia Faucet
            </span>
          </Link>
        ) : status === "connecting" || status === "reconnecting" ? (
          <p className="flex items-center gap-2 h-10 px-4 bg-blue-500/10 rounded-md text-sm font-medium text-blue-500 cursor-pointer">
            <Loader className="size-4 animate-spin" />
            <span className="hidden sm:block capitalize">{status}...</span>
          </p>
        ) : (
          <p className="flex items-center gap-2 h-10 px-4 bg-red-500/10 rounded-md text-sm font-medium text-destructive">
            <TbPlugConnectedX className="size-5" />
            <span className="hidden sm:block">No account connected</span>
          </p>
        )}

        <div className="ml-auto">
          <ConnectKitButton showBalance showAvatar={true} />
        </div>
      </Wrapper>
    </header>
  );
}
