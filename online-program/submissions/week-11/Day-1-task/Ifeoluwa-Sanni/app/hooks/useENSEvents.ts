import { useEffect, useMemo, useState } from 'react';
import { usePublicClient, useWatchContractEvent } from 'wagmi';
import { decodeFunctionData, parseAbiItem } from 'viem';
import { ENSContract } from '../services/contract';

interface ENSEvent {
  id: string;
  type: 'NameRegistered' | 'NameTransferred' | 'NameUpdated';
  payload: any;
  timestamp: number;
}

export const useENSEvents = () => {
  const [events, setEvents] = useState<ENSEvent[]>([]);
  const client = usePublicClient();

  const eventParsers = useMemo(() => ({
    NameRegistered: parseAbiItem('event NameRegistered(string indexed name, address indexed owner, string imageHash)'),
    NameTransferred: parseAbiItem('event NameTransferred(string indexed name, address indexed oldOwner, address indexed newOwner)'),
    NameUpdated: parseAbiItem('event NameUpdated(string indexed name, address indexed newAddress, string newImageHash)'),
  }), []);

  const looksHashed = (value: unknown) => typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
  const resolveNameFromTx = async (hash: `0x${string}`): Promise<string | undefined> => {
    if (!client) return undefined;
    try {
      const tx = await client.getTransaction({ hash });
      const decoded = decodeFunctionData({ abi: ENSContract.contractABI, data: tx.input });
      const fn = decoded.functionName;
      if (fn === 'registerName' || fn === 'transferName' || fn === 'updateAddress' || fn === 'updateImage') {
        const arg0 = (decoded.args as any)?.[0];
        if (typeof arg0 === 'string') return arg0;
      }
    } catch {}
    return undefined;
  };

  useEffect(() => {
    let cancelled = false;
    const loadHistorical = async () => {
      if (!client) return;
      try {
        const latest = await client.getBlockNumber();
        const range = BigInt(50000);
        const fromBlock = latest > range ? latest - range : BigInt(0);
        const toBlock = latest;

        const [regLogs, xferLogs, updLogs] = await Promise.all([
          client.getLogs({ address: ENSContract.contractAddr, event: eventParsers.NameRegistered, fromBlock, toBlock }),
          client.getLogs({ address: ENSContract.contractAddr, event: eventParsers.NameTransferred, fromBlock, toBlock }),
          client.getLogs({ address: ENSContract.contractAddr, event: eventParsers.NameUpdated, fromBlock, toBlock }),
        ]);

        const histReg = await Promise.all(regLogs.map(async (log) => {
          const a = (log as any).args as { name: string; owner: `0x${string}`; imageHash: string };
          const name = looksHashed(a.name) ? (await resolveNameFromTx(log.transactionHash)) ?? a.name : a.name;
          return {
            id: `${log.transactionHash}-${log.logIndex}`,
            type: 'NameRegistered' as const,
            payload: { name, owner: a.owner, imageHash: a.imageHash },
            timestamp: Date.now(),
          } satisfies ENSEvent;
        }));

        const histXfer = await Promise.all(xferLogs.map(async (log) => {
          const a = (log as any).args as { name: string; oldOwner: `0x${string}`; newOwner: `0x${string}` };
          const name = looksHashed(a.name) ? (await resolveNameFromTx(log.transactionHash)) ?? a.name : a.name;
          return {
            id: `${log.transactionHash}-${log.logIndex}`,
            type: 'NameTransferred' as const,
            payload: { name, oldOwner: a.oldOwner, newOwner: a.newOwner },
            timestamp: Date.now(),
          } satisfies ENSEvent;
        }));

        const histUpd = await Promise.all(updLogs.map(async (log) => {
          const a = (log as any).args as { name: string; newAddress: `0x${string}`; newImageHash: string };
          const name = looksHashed(a.name) ? (await resolveNameFromTx(log.transactionHash)) ?? a.name : a.name;
          return {
            id: `${log.transactionHash}-${log.logIndex}`,
            type: 'NameUpdated' as const,
            payload: { name, newAddress: a.newAddress, newImageHash: a.newImageHash },
            timestamp: Date.now(),
          } satisfies ENSEvent;
        }));

        const hist: ENSEvent[] = [...histReg, ...histXfer, ...histUpd].sort((a, b) => (a.id < b.id ? 1 : -1));

        if (!cancelled) setEvents((prev) => {
          const existing = new Set(prev.map((e) => e.id));
          const merged = [...hist.filter((e) => !existing.has(e.id)), ...prev];
          return merged.slice(0, 50);
        });
      } catch (e) {
        // swallow
      }
    };
    loadHistorical();
    return () => { cancelled = true };
  }, [client, eventParsers]);

  useWatchContractEvent({
    address: ENSContract.contractAddr,
    abi: ENSContract.contractABI,
    chainId: 11155111,
    eventName: 'NameRegistered',
    onLogs: async (logs) => {
      const mapped = await Promise.all(logs.map(async (log) => {
        const a = (log as any).args as { name: string; owner: `0x${string}`; imageHash: string };
        const name = looksHashed(a.name) ? (await resolveNameFromTx(log.transactionHash)) ?? a.name : a.name;
        return {
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'NameRegistered' as const,
          payload: { name, owner: a.owner, imageHash: a.imageHash },
          timestamp: Date.now(),
        } satisfies ENSEvent;
      }));
      setEvents(prev => {
        const existing = new Set(prev.map(e => e.id));
        const merged = [...mapped.filter(e => !existing.has(e.id)), ...prev];
        return merged.slice(0, 50);
      });
    },
  });

  useWatchContractEvent({
    address: ENSContract.contractAddr,
    abi: ENSContract.contractABI,
    chainId: 11155111,
    eventName: 'NameTransferred',
    onLogs: async (logs) => {
      const mapped = await Promise.all(logs.map(async (log) => {
        const a = (log as any).args as { name: string; oldOwner: `0x${string}`; newOwner: `0x${string}` };
        const name = looksHashed(a.name) ? (await resolveNameFromTx(log.transactionHash)) ?? a.name : a.name;
        return {
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'NameTransferred' as const,
          payload: { name, oldOwner: a.oldOwner, newOwner: a.newOwner },
          timestamp: Date.now(),
        } satisfies ENSEvent;
      }));
      setEvents(prev => {
        const existing = new Set(prev.map(e => e.id));
        const merged = [...mapped.filter(e => !existing.has(e.id)), ...prev];
        return merged.slice(0, 50);
      });
    },
  });

  useWatchContractEvent({
    address: ENSContract.contractAddr,
    abi: ENSContract.contractABI,
    chainId: 11155111,
    eventName: 'NameUpdated',
    onLogs: async (logs) => {
      const mapped = await Promise.all(logs.map(async (log) => {
        const a = (log as any).args as { name: string; newAddress: `0x${string}`; newImageHash: string };
        const name = looksHashed(a.name) ? (await resolveNameFromTx(log.transactionHash)) ?? a.name : a.name;
        return {
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'NameUpdated' as const,
          payload: { name, newAddress: a.newAddress, newImageHash: a.newImageHash },
          timestamp: Date.now(),
        } satisfies ENSEvent;
      }));
      setEvents(prev => {
        const existing = new Set(prev.map(e => e.id));
        const merged = [...mapped.filter(e => !existing.has(e.id)), ...prev];
        return merged.slice(0, 50);
      });
    },
  });

  return events;
};