export function handleErrorMessage(error: any) {
    console.error("Contract error details:", error);
    
    if (error.code === "ACTION_REJECTED") {
      throw new Error("Transaction rejected by user");
    } else if (error.code === "INSUFFICIENT_FUNDS") {
      throw new Error("Insufficient funds for gas");
    } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
      throw new Error("Transaction may fail");
    } else if (error.code === "CALL_EXCEPTION") {
      if (error.reason === "missing revert data") {
        throw new Error("Contract call failed - check if contract exists and network connection");
      }
      throw new Error(`Contract call failed: ${error.reason || error.message}`);
    } else if (error.message?.includes("missing revert data")) {
      throw new Error("Contract call failed - check contract address and network connection");
    }
  }
  
  export function truncateAddr(
    str: string | undefined,
    n: number = 6
  ): string | undefined {
    if (!str) return "undefined";
    return str?.length > n
      ? str.slice(0, n) + "..." + str.slice(str.length - 4)
      : str;
  }
  