import React, { useState } from 'react';
import { Contract } from 'ethers';
import { useAccount } from 'wagmi';
import { truncateAddr } from '@/utils/utils';

interface UpdateAddressProps {
  contract: Contract | null;
  onSuccess?: (name: string, newAddress: string, txHash: string) => void;
  onError?: (error: string) => void;
}

interface NameDetails {
  owner: string;
  currentAddress: string;
  imageHash: string;
  registrationTime: number;
}

export const UpdateAddress: React.FC<UpdateAddressProps> = ({
  contract,
  onSuccess,
  onError,
}) => {
  const { address } = useAccount();
  
  // Form states
  const [name, setName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  
  // Loading states
  const [updating, setUpdating] = useState(false);
  const [checkingOwnership, setCheckingOwnership] = useState(false);
  
  // Status states
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [nameExists, setNameExists] = useState<boolean | null>(null);
  const [nameDetails, setNameDetails] = useState<NameDetails | null>(null);

  const checkNameOwnership = async () => {
    if (!contract || !name.trim() || !address) return;

    try {
      setCheckingOwnership(true);
      
      // Check if name exists and get details
      const available = await contract.isNameAvailable(name.trim());
      setNameExists(!available);
      
      if (!available) {
        // Name exists, get details
        const result = await contract.resolveName(name.trim());
        const [owner, resolvedAddress, imageHash, registrationTime] = result;
        
        const details: NameDetails = {
          owner,
          currentAddress: resolvedAddress,
          imageHash,
          registrationTime: Number(registrationTime)
        };
        
        setNameDetails(details);
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
        
        // Pre-fill the new address with current address for convenience
        if (!newAddress) {
          setNewAddress(resolvedAddress);
        }
      } else {
        setIsOwner(false);
        setNameDetails(null);
      }
      
      setCheckingOwnership(false);
    } catch (error) {
      console.error('Ownership check error:', error);
      setCheckingOwnership(false);
      onError?.('Failed to check name ownership');
    }
  };

  const updateAddress = async () => {
    if (!contract) {
      onError?.('Contract not initialized');
      return;
    }

    if (!address) {
      onError?.('Please connect your wallet');
      return;
    }

    if (!name.trim()) {
      onError?.('Please enter a name');
      return;
    }

    if (!newAddress.trim()) {
      onError?.('Please enter the new address');
      return;
    }

    if (!isValidAddress(newAddress)) {
      onError?.('Please enter a valid Ethereum address');
      return;
    }

    if (!isOwner) {
      onError?.('You do not own this name');
      return;
    }

    if (nameDetails && newAddress.toLowerCase() === nameDetails.currentAddress.toLowerCase()) {
      onError?.('New address is the same as current address');
      return;
    }

    try {
      setUpdating(true);
      
      // Call the updateAddress function on the contract
      const tx = await contract.updateAddress(
        name.trim(),
        newAddress.trim()
      );
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      setUpdating(false);
      onSuccess?.(name.trim(), newAddress.trim(), receipt.transactionHash);
      
      // Update local state to reflect the change
      if (nameDetails) {
        setNameDetails({
          ...nameDetails,
          currentAddress: newAddress.trim()
        });
      }
      
    } catch (error: unknown) { // Fixed: properly typed error
      console.error('Update error:', error);
      setUpdating(false);
      
      // Handle different error types with proper type checking
      if (error && typeof error === 'object' && 'code' in error && error.code === 4001) {
        onError?.('Transaction rejected by user');
      } else if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);
        if (message.includes('Not the owner')) {
          onError?.('You are not the owner of this name');
        } else if (message.includes('Name does not exist')) {
          onError?.('Name does not exist');
        } else if (message.includes('insufficient funds')) {
          onError?.('Insufficient funds for transaction');
        } else {
          onError?.('Address update failed. Please try again.');
        }
      } else {
        onError?.('Address update failed. Please try again.');
      }
    }
  };

  // Validate Ethereum address format
  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">Update Address</h2>
      
      {/* Name Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Name to Update
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setIsOwner(null);
              setNameExists(null);
              setNameDetails(null);
              setNewAddress('');
            }}
            placeholder="Enter name (e.g., alice)"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            maxLength={64}
          />
          <button
            onClick={checkNameOwnership}
            disabled={!name.trim() || checkingOwnership || !address}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm"
          >
            {checkingOwnership ? 'Checking...' : 'Load'}
          </button>
        </div>
        
        {/* Ownership status */}
        {nameExists === false && (
          <p className="text-red-500 text-sm">✗ Name does not exist</p>
        )}
        {nameExists === true && isOwner === true && (
          <p className="text-green-500 text-sm">✓ You own this name</p>
        )}
        {nameExists === true && isOwner === false && (
          <p className="text-red-500 text-sm">✗ You do not own this name</p>
        )}
      </div>

      {/* Current Name Details */}
      {nameDetails && isOwner && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="text-lg font-semibold text-white">Current Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Current Address:</p>
              <p className="text-blue-400 font-mono">{truncateAddr(nameDetails.currentAddress)}</p>
            </div>
            <div>
              <p className="text-gray-400">Owner:</p>
              <p className="text-green-400 font-mono">{truncateAddr(nameDetails.owner)}</p>
            </div>
            <div>
              <p className="text-gray-400">Registered:</p>
              <p className="text-white">{formatDate(nameDetails.registrationTime)}</p>
            </div>
            <div>
              <p className="text-gray-400">Image Hash:</p>
              <p className="text-gray-300 font-mono text-xs">
                {nameDetails.imageHash ? truncateAddr(nameDetails.imageHash) : 'No image'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* New Address Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          New Resolved Address
        </label>
        <input
          type="text"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          placeholder="0x..."
          disabled={!isOwner}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {newAddress && !isValidAddress(newAddress) && (
          <p className="text-red-500 text-sm">Invalid Ethereum address format</p>
        )}
        {nameDetails && newAddress && newAddress.toLowerCase() === nameDetails.currentAddress.toLowerCase() && (
          <p className="text-yellow-500 text-sm">This is the same as the current address</p>
        )}
      </div>

      {/* Info Box */}
      {isOwner === true && (
        <div className="bg-blue-900 border border-blue-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 text-xl">ℹ️</span>
            <div className="text-blue-200">
              <p className="font-medium mb-1">Address Update</p>
              <p className="text-sm">
                This will change where &quot;{name}&quot; resolves to. The new address will be used 
                when someone looks up this name. This does not affect ownership.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Update Button */}
      <button
        onClick={updateAddress}
        disabled={
          !name.trim() ||
          !newAddress.trim() ||
          !isValidAddress(newAddress) ||
          !isOwner ||
          updating ||
          (nameDetails && newAddress.toLowerCase() === nameDetails.currentAddress.toLowerCase())
        }
        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
      >
        {updating ? 'Updating...' : 'Update Address'}
      </button>
    </div>
  );
};