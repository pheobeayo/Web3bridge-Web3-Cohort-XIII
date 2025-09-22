import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import contracts from "@/contracts/contracts";
import { NAME_SERVICE_EVENTS } from "@/contracts/events";

export interface NameServiceEventBase {
  eventName: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  timestamp: bigint; // Add timestamp to the base interface
}

export interface NameRegisteredEventData extends NameServiceEventBase {
  eventName: "NameRegistered";
  name: string;
  owner: `0x${string}`;
  imageHash: string;
}

export interface NameTransferredEventData extends NameServiceEventBase {
  eventName: "NameTransferred";
  name: string;
  oldOwner: `0x${string}`;
  newOwner: `0x${string}`;
}

export interface NameUpdatedEventData extends NameServiceEventBase {
  eventName: "NameUpdated";
  name: string;
  newAddress: `0x${string}`;
  newImageHash: string;
}

export type NameServiceEventData =
  | NameRegisteredEventData
  | NameTransferredEventData
  | NameUpdatedEventData;

export function useNameServiceEvents() {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["name-service-events", contracts.ENS.address],
    queryFn: async (): Promise<NameServiceEventData[]> => {
      if (!publicClient) return [];

      try {
        // Fetch all event types in parallel
        const [nameRegisteredLogs, nameTransferredLogs, nameUpdatedLogs] =
          await Promise.all([
            publicClient.getLogs({
              address: contracts.ENS.address,
              event: NAME_SERVICE_EVENTS.NameRegistered,
              fromBlock: "earliest",
              toBlock: "latest",
            }),
            publicClient.getLogs({
              address: contracts.ENS.address,
              event: NAME_SERVICE_EVENTS.NameTransferred,
              fromBlock: "earliest",
              toBlock: "latest",
            }),
            publicClient.getLogs({
              address: contracts.ENS.address,
              event: NAME_SERVICE_EVENTS.NameUpdated,
              fromBlock: "earliest",
              toBlock: "latest",
            }),
          ]);

        // Get unique block numbers for batch fetching timestamps
        const allLogs = [
          ...nameRegisteredLogs,
          ...nameTransferredLogs,
          ...nameUpdatedLogs,
        ];
        const uniqueBlockNumbers = [
          ...new Set(allLogs.map((log) => log.blockNumber)),
        ];

        // Batch fetch all block timestamps
        const blocks = await Promise.all(
          uniqueBlockNumbers.map((blockNumber) =>
            publicClient.getBlock({ blockNumber }),
          ),
        );

        // Create a map of block number to timestamp
        const blockTimestamps = new Map<bigint, bigint>();
        blocks.forEach((block) => {
          blockTimestamps.set(block.number!, block.timestamp);
        });

        // Transform and combine all events with timestamps
        const allEvents: NameServiceEventData[] = [
          // Name Registered Events
          ...nameRegisteredLogs.map(
            (log): NameRegisteredEventData => ({
              eventName: "NameRegistered",
              name: log.args.name!,
              owner: log.args.owner!,
              imageHash: log.args.imageHash!,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              logIndex: log.logIndex,
              timestamp: blockTimestamps.get(log.blockNumber) || 0n,
            }),
          ),

          // Name Transferred Events
          ...nameTransferredLogs.map(
            (log): NameTransferredEventData => ({
              eventName: "NameTransferred",
              name: log.args.name!,
              oldOwner: log.args.oldOwner!,
              newOwner: log.args.newOwner!,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              logIndex: log.logIndex,
              timestamp: blockTimestamps.get(log.blockNumber) || 0n,
            }),
          ),

          // Name Updated Events
          ...nameUpdatedLogs.map(
            (log): NameUpdatedEventData => ({
              eventName: "NameUpdated",
              name: log.args.name!,
              newAddress: log.args.newAddress!,
              newImageHash: log.args.newImageHash!,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              logIndex: log.logIndex,
              timestamp: blockTimestamps.get(log.blockNumber) || 0n,
            }),
          ),
        ];

        // Sort by timestamp (most recent first)
        return allEvents.sort((a, b) => {
          if (a.timestamp !== b.timestamp) {
            return Number(b.timestamp - a.timestamp);
          }
          // If same timestamp, sort by log index
          return b.logIndex - a.logIndex;
        });
      } catch (error) {
        console.error("Error fetching Name Service events:", error);
        return [];
      }
    },
    enabled: !!publicClient,
    staleTime: 50000, // Cache for 50 seconds
    refetchInterval: 100000, // Refetch every 100 seconds
  });
}

// Helper function to get human-readable event descriptions
export function getEventDescription(event: NameServiceEventData): string {
  switch (event.eventName) {
    case "NameRegistered":
      return `New name registered: ${event.name}`;
    case "NameTransferred":
      return `Name ${event.name} transferred`;
    case "NameUpdated":
      return `Name ${event.name} updated`;
    default:
      return "Unknown event";
  }
}

// Helper function to get event icons/colors
export function getEventStyle(event: NameServiceEventData): {
  icon: string;
  color: string;
} {
  switch (event.eventName) {
    case "NameRegistered":
      return { icon: "🆕", color: "text-blue-600" };
    case "NameTransferred":
      return { icon: "🔄", color: "text-green-600" };
    case "NameUpdated":
      return { icon: "✏️", color: "text-yellow-600" };
    default:
      return { icon: "❓", color: "text-gray-600" };
  }
}
