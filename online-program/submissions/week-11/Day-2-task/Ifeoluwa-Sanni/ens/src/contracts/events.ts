// contracts/events.ts
import { parseAbiItem } from "viem";

export interface NameRegisteredEvent {
  name: string;
  owner: `0x${string}`;
  imageHash: string;
}

export interface NameTransferredEvent {
  name: string;
  oldOwner: `0x${string}`;
  newOwner: `0x${string}`;
}

export interface NameUpdatedEvent {
  name: string;
  newAddress: `0x${string}`;
  newImageHash: string;
}

// Union type for all Name Service events
export type NameServiceEvent =
  | (NameRegisteredEvent & { eventName: "NameRegistered" })
  | (NameTransferredEvent & { eventName: "NameTransferred" })
  | (NameUpdatedEvent & { eventName: "NameUpdated" });

export const NAME_SERVICE_EVENTS = {
  NameRegistered: parseAbiItem(
    "event NameRegistered(string indexed name, address indexed owner, string imageHash)",
  ),
  NameTransferred: parseAbiItem(
    "event NameTransferred(string indexed name, address indexed oldOwner, address indexed newOwner)",
  ),
  NameUpdated: parseAbiItem(
    "event NameUpdated(string indexed name, address indexed newAddress, string newImageHash)",
  ),
} as const;

// Event names array for easier iteration
export const NAME_SERVICE_EVENT_NAMES = Object.keys(
  NAME_SERVICE_EVENTS,
) as Array<keyof typeof NAME_SERVICE_EVENTS>;

// Helper type for decoded events with metadata
export type DecodedNameServiceEvent = NameServiceEvent & {
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  address: `0x${string}`;
};
