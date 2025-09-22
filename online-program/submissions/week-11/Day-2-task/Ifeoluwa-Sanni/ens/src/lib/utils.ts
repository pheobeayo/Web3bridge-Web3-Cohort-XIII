import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatEther } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function trimSpace(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "");
}

// Formatting helper
export const formatNumber = (value: bigint | undefined) => {
  if (value === undefined) return "0.00";
  return parseFloat(formatEther(value)).toFixed(2);
};

export function generateColorFromAddress(address?: string): string {
  // Simple deterministic color generator (hash the address)
  if (!address) return "#ccc";
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export function truncateAddress(
  address: `0x${string}` | string | undefined,
  chars = 4,
): string {
  if (!address) return "";
  return `${address.substring(0, chars + 2)}...${address.substring(
    address.length - chars,
  )}`;
}

// Helper function to format relative time without date-fns
export function getAbsoluteTime(blockTimestamp: bigint): string {
  const timestamp = Number(blockTimestamp) * 1000;
  return new Date(timestamp).toLocaleString();
}

export function formatRelativeTime(blockTimestamp: bigint): string {
  // Convert block timestamp (seconds) to milliseconds
  const timestamp = Number(blockTimestamp) * 1000;
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}
