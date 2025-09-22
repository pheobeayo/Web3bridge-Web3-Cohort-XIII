import type { Abi, Address } from "viem";
import ENS_ABI from "./abis/ENS";

type TContracts = Record<
  string,
  {
    address: Address;
    abi: Abi;
  }
>;

const contracts = {
  ENS: {
    address: "0x9e238b6f9451dbfD55157e21111B09d895c10be7",
    abi: ENS_ABI,
  },
} as const satisfies TContracts;

export default contracts;
