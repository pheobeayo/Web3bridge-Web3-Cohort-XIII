import React, { useState, useEffect, useCallback } from 'react';
import { Contract } from 'ethers';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { truncateAddr } from '@/utils/utils';

interface OwnedNamesDisplayProps {
  contract: Contract | null;
  onError?: (error: string) => void;
  onNameClick?: (name: string) => void;
}

interface NameDetails {
  name: string;
  owner: string;
  resolvedAddress: string;
  imageHash: string;
  registrationTime: number;
  imageUrl?: string;
}

export const OwnedNamesDisplay: React.FC<OwnedNamesDisplayProps> = ({
  contract,
  onError,
  onNameClick,
}) => {
  const { address } = useAccount();
  const [ownedNames, setOwnedNames] = useState<string[]>([]);
  const [nameDetails, setNameDetails] = useState<NameDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [currentSearchAddress, setCurrentSearchAddress] = useState('');

  const loadNameDetails = useCallback(async (names: string[]) => {
    if (!contract) return;

    try {
      setLoadingDetails(true);
      const details: NameDetails[] = [];

      for (const name of names) {
        try {
          const result = await contract.resolveName(name);
          const [owner, resolvedAddress, imageHash, registrationTime] = result;
          
          // Convert IPFS hash to URL if it exists
          let imageUrl;
          if (imageHash) {
            imageUrl = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
          }

          details.push({
            name,
            owner,
            resolvedAddress,
            imageHash,
            registrationTime: Number(registrationTime),
            imageUrl,
          });
        } catch (error) {
          console.error(`Error loading details for ${name}:`, error);
        }
      }

      setNameDetails(details);
      setLoadingDetails(false);
    } catch (error) {
      console.error('Error loading name details:', error);
      setLoadingDetails(false);
      onError?.('Failed to load name details');
    }
  }, [contract, onError]);

  const loadNamesForAddress = useCallback(async (targetAddress: string) => {
    if (!contract || !targetAddress) return;

    try {
      setLoading(true);
      setCurrentSearchAddress(targetAddress);
      
      const names = await contract.getNamesOwnedBy(targetAddress);
      setOwnedNames(names);
      
      // Load details for each name
      if (names.length > 0) {
        await loadNameDetails(names);
      } else {
        setNameDetails([]);
      }
      
      setLoading(false);
    } catch (error: unknown) {
      console.error('Error loading owned names:', error);
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(`Failed to load owned names: ${errorMessage}`);
    }
  }, [contract, loadNameDetails, onError]);

  // Load names for current user on component mount
  useEffect(() => {
    if (address && contract) {
      loadNamesForAddress(address);
    }
  }, [address, contract, loadNamesForAddress]);

  const handleSearch = () => {
    if (!searchAddress.trim()) {
      onError?.('Please enter an address to search');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(searchAddress.trim())) {
      onError?.('Please enter a valid Ethereum address');
      return;
    }

    loadNamesForAddress(searchAddress.trim());
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleLoadMyNames = () => {
    if (address) {
      setSearchAddress(address);
      loadNamesForAddress(address);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0zMiAyOEMyNi40NzcgMjggMjIgMjMuNTIzIDIyIDE4UzI2LjQ3NyA4IDMyIDhTNDIgMTIuNDc3IDQyIDE4UzM3LjUyMyAyOCAzMiAyOFpNMzIgMzJDNDEuMzMzIDMyIDQ5IDM5LjY2NyA0OSA0OUM0OSA1MS4yMDkgNDcuMjA5IDUzIDQ1IDUzSDE5QzE2Ljc5MSA1MyAxNSA1MS4yMDkgMTUgNDlDMTUgMzkuNjY3IDIyLjY2NyAzMiAzMiAzMloiIGZpbGw9IiM2QjczODAiLz4KPC9zdmc+';
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Owned Names</h2>
        {address && (
          <button
            onClick={handleLoadMyNames}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Load My Names
          </button>
        )}
      </div>

      {/* Search for names by address */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Search names by owner address
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            placeholder="Enter Ethereum address (0x...)"
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={!searchAddress.trim() || loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            Loading names...
          </div>
        </div>
      )}

      {/* Current search info */}
      {currentSearchAddress && !loading && (
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-300 text-sm">
            Showing names owned by: <span className="text-white font-mono">{truncateAddr(currentSearchAddress)}</span>
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Found {ownedNames.length} name{ownedNames.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Names List */}
      {!loading && ownedNames.length === 0 && currentSearchAddress && (
        <div className="text-center py-8 text-gray-400">
          <p>No names found for this address</p>
        </div>
      )}

      {!loading && ownedNames.length > 0 && (
        <div className="space-y-4">
          {loadingDetails && (
            <div className="text-center text-gray-400">
              <p>Loading name details...</p>
            </div>
          )}

          <div className="grid gap-4">
            {nameDetails.map((nameDetail) => (
              <div
                key={nameDetail.name}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                onClick={() => onNameClick?.(nameDetail.name)}
              >
                <div className="flex items-start gap-4">
                  {/* Profile Image */}
                  <div className="w-16 h-16 rounded-lg bg-gray-700 flex-shrink-0 overflow-hidden relative">
                    {nameDetail.imageUrl ? (
                      <Image
                        src={nameDetail.imageUrl}
                        alt={`${nameDetail.name} profile`}
                        fill
                        className="object-cover"
                        onError={handleImageError}
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-xl">👤</span>
                      </div>
                    )}
                  </div>

                  {/* Name Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {nameDetail.name}
                      </h3>
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                        ENS
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-gray-400">Resolves to:</span>
                        <span className="font-mono text-blue-400">
                          {truncateAddr(nameDetail.resolvedAddress)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-gray-400">Owner:</span>
                        <span className="font-mono text-green-400">
                          {truncateAddr(nameDetail.owner)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-gray-400">Registered:</span>
                        <span>{formatDate(nameDetail.registrationTime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Indicator */}
                  <div className="flex items-center text-gray-400">
                    <span className="text-sm">Click for details</span>
                    <span className="ml-2">→</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};