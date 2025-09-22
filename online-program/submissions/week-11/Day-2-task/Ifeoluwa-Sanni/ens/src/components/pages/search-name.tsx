import { Button } from "@/components/ui/button";
import { Input } from "../ui/input";
import { useReadContract } from "wagmi";
import contracts from "@/contracts/contracts";
import { formatRelativeTime } from "@/lib/utils";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Search, Clock } from "lucide-react";
import { CHAIN_IDS } from "@/lib/chain-utils";
import { useAccount } from "wagmi";
import { Hash } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { trimSpace } from "@/lib/utils";

export default function ENSSearch() {
  const [searchName, setSearchName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const { chainId, chain, address } = useAccount();

  const { data, isError, isLoading, refetch } = useReadContract({
    ...contracts.ENS,
    functionName: "nameRecords",
    args: [searchName],
    chainId: CHAIN_IDS.CELO_ALFAJORES,
    query: {
      enabled: false,
    },
  });

  const handleSearch = async () => {
    if (!searchName.trim()) return;
    setHasSearched(true);
    refetch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Check if name exists based on the `exists` field (data[4])
  const nameExists = data && data[4] === true;
  const nameAvailable = hasSearched && data && data[4] === false;

  if (address && chainId !== CHAIN_IDS.CELO_ALFAJORES) {
    return (
      <main className="">
        <section className="bg-linear-to-b to-muted from-background min-h-screen flex items-center">
          <div className="relative z-10 mx-auto w-full max-w-5xl px-6 text-center">
            <div className="items-center">
              <h1 className="text-balance text-5xl font-bold md:text-6xl tracking-widest leading-[1.5]">
                Your <span className="text-[#fa0707]">Identity</span> On-Chain
              </h1>
              <p className="text-xl text-muted-foreground mt-4 mb-8 max-w-2xl mx-auto">
                Register your .eth domain and own your digital identity forever
              </p>

              {/* Search Section */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-3 max-w-2xl mx-auto mt-8">
                <div className="relative flex-1 w-full">
                  <Input
                    type="text"
                    className="h-12 border-zinc-400 pl-4 pr-16"
                    placeholder="yourname"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyDown={handleKeyPress}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    .eth
                  </span>
                </div>
                <Button
                  size="lg"
                  className="px-8 w-full md:w-auto text-lg h-12"
                  onClick={handleSearch}
                  disabled={!searchName.trim() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Search className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Check Availability"
                  )}
                </Button>
                React
              </div>

              {/* Results Section */}
              <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl border border-border bg-card mt-12 shadow-lg bg-gradient-to-tl from-muted to-background">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                  <Hash className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Wrong Network</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Please switch to the Celo Alfajores network.
                </p>
                <Badge variant="outline" className="mt-3">
                  Current: {chainId ? ` ${chain?.name}` : "Unknown"}
                </Badge>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="">
        <section className="bg-linear-to-b to-muted from-background min-h-screen flex items-center">
          <div className="relative z-10 mx-auto w-full max-w-5xl px-6 text-center">
            <div className="items-center">
              <h1 className="text-balance text-5xl font-bold md:text-6xl tracking-widest leading-[1.5]">
                Your <span className="text-blue-900">Identity</span> On-Chain
              </h1>
              <p className="text-xl text-muted-foreground mt-4 mb-8 max-w-2xl mx-auto">
                Register your .eth domain and own your digital identity forever
              </p>

              {/* Search Section */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-3 max-w-2xl mx-auto mt-8">
                <div className="relative flex-1 w-full">
                  <Input
                    type="text"
                    className="h-12 border-zinc-400 pl-4 pr-16"
                    placeholder="yourname"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    .eth
                  </span>
                </div>
                <Button
                  size="lg"
                  className="px-8 w-full md:w-auto text-lg h-12"
                  onClick={handleSearch}
                  disabled={!searchName.trim() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Search className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Check Availability"
                  )}
                </Button>
              </div>

              {/* Results Section */}
              <div className="mt-8 max-w-2xl mx-auto">
                {isLoading && (
                  <div className="flex items-center justify-center gap-2 p-4 bg-muted/50 rounded-lg">
                    <Search className="w-4 h-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Searching for "{searchName}.eth"...
                    </p>
                  </div>
                )}

                {isError && (
                  <div className="flex items-center justify-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg bg-gradient-to-tl from-muted to-background">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-600">
                      Error checking name availability. Make sure your wallet is
                      connected and try again.
                    </p>
                  </div>
                )}

                {/* Name Available */}
                {nameAvailable && (
                  <div className="p-6 bg-card border border-border rounded-lg shadow-lg bg-gradient-to-tl from-muted to-background">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <Badge
                        variant="secondary"
                        className="bg-green-600/20 border-green-600 text-secondary-foreground"
                      >
                        Available
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      "{trimSpace(searchName)}.eth" is available!
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You can register this name and make it yours.
                    </p>
                    <Button
                      asChild
                      className="bg-[#007707] hover:bg-[#009907]/90 text-white"
                    >
                      <Link
                        to="/register-name"
                        search={{ name: trimSpace(searchName) }}
                      >
                        Register Now
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Name Taken */}
                {nameExists && (
                  <div className="p-6 bg-card border border-border rounded-lg shadow-lg bg-gradient-to-tl from-muted to-background">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <Badge
                        variant="secondary"
                        className="bg-red-600/20 border-red-600 text-secondary-foreground"
                      >
                        Taken
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold mb-4">
                      "{searchName}.eth" is already registered
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-muted/30 p-3 rounded border border-border">
                          <span className="font-medium text-foreground">
                            Owner:
                          </span>
                          <p className="font-mono text-xs break-all mt-1 text-muted-foreground">
                            {data[0]}
                          </p>
                        </div>

                        <div className="bg-muted/30 p-3 rounded border border-border">
                          <span className="font-medium text-foreground">
                            Resolved Address:
                          </span>
                          <p className="font-mono text-xs break-all mt-1 text-muted-foreground">
                            {data[1] !==
                              "0x0000000000000000000000000000000000000000"
                              ? data[1]
                              : "Not set"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-muted/30 p-3 rounded border border-border">
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Registration Time:
                        </span>
                        <p className="text-muted-foreground mt-1">
                          {formatRelativeTime(data[3])}
                        </p>
                      </div>

                      {data[2] && data[2] !== "" && (
                        <div className="bg-muted/30 p-3 rounded border border-border">
                          <span className="font-medium text-foreground">
                            Image Hash:
                          </span>
                          <p className="font-mono text-xs break-all mt-1 text-muted-foreground">
                            {data[2]}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-3">
                        Try a different name or check back later if this name
                        becomes available.
                      </p>
                      <Button
                        variant="secondary"
                        className="w-4/5 "
                        onClick={() => {
                          setSearchName("");
                          setHasSearched(false);
                        }}
                      >
                        Search Another Name
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
