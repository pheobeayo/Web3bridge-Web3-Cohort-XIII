import React, { useState } from 'react';
import { Contract } from 'ethers';
import { useAccount } from 'wagmi';

interface TransferNameProps {
  contract: Contract | null;
  onSuccess?: (name: string, newOwner: string, txHash: string) => void;
  onError?: (error: string) => void;
}

export const TransferName: React.FC<TransferNameProps> = ({
  contract,
  onSuccess,
  onError,
}) => {
  const { address } = useAccount();
  
  // Form states
  const [name, setName] = useState('');
  const [newOwner, setNewOwner] = useState('');
  
  // Loading states
  const [transferring, setTransferring] = useState(false);
  const [checkingOwnership, setCheckingOwnership] = useState(false);
  
  // Status states
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [nameExists, setNameExists] = useState<boolean | null>(null);

  const checkNameOwnership = async () => {
    if (!contract || !name.trim() || !address) return;

    try {
      setCheckingOwnership(true);
      
      // Check if name exists and get owner
      const available = await contract.isNameAvailable(name.trim());
      setNameExists(!available);
      
      if (!available) {
        // Name exists, check if current user is the owner
        const result = await contract.resolveName(name.trim());
        const [owner] = result;
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
      } else {
        setIsOwner(false);
      }
      
      setCheckingOwnership(false);
    } catch (error) {
      console.error('Ownership check error:', error);
      setCheckingOwnership(false);
      onError?.('Failed to check name ownership');
    }
  };

  const transferName = async () => {
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

    if (!newOwner.trim()) {
      onError?.('Please enter the new owner address');
      return;
    }

    if (!isValidAddress(newOwner)) {
      onError?.('Please enter a valid Ethereum address');
      return;
    }

    if (newOwner.toLowerCase() === address.toLowerCase()) {
      onError?.('Cannot transfer to yourself');
      return;
    }

    if (!isOwner) {
      onError?.('You do not own this name');
      return;
    }

    try {
      setTransferring(true);
      
      // Call the transferName function on the contract
      const tx = await contract.transferName(
        name.trim(),
        newOwner.trim()
      );
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      setTransferring(false);
      onSuccess?.(name.trim(), newOwner.trim(), receipt.transactionHash);
      
      // Reset form
      setName('');
      setNewOwner('');
      setIsOwner(null);
      setNameExists(null);
      
    } catch (error: unknown) {
      console.error('Transfer error:', error);
      setTransferring(false);
      
      // Handle different error types with proper type checking
      if (error && typeof error === 'object' && 'code' in error && error.code === 4001) {
        onError?.('Transaction rejected by user');
      } else if (error instanceof Error) {
        if (error.message.includes('Not the owner')) {
          onError?.('You are not the owner of this name');
        } else if (error.message.includes('Name does not exist')) {
          onError?.('Name does not exist');
        } else if (error.message.includes('insufficient funds')) {
          onError?.('Insufficient funds for transaction');
        } else {
          onError?.(`Transfer failed: ${error.message}`);
        }
      } else {
        onError?.('Transfer failed. Please try again.');
      }
    }
  };

  // Validate Ethereum address format
  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">Transfer Name</h2>
      
      {/* Name Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Name to Transfer
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setIsOwner(null);
              setNameExists(null);
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
            {checkingOwnership ? 'Checking...' : 'Verify'}
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

      {/* New Owner Address Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          New Owner Address
        </label>
        <input
          type="text"
          value={newOwner}
          onChange={(e) => setNewOwner(e.target.value)}
          placeholder="0x..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
        {newOwner && !isValidAddress(newOwner) && (
          <p className="text-red-500 text-sm">Invalid Ethereum address format</p>
        )}
        {newOwner && address && newOwner.toLowerCase() === address.toLowerCase() && (
          <p className="text-red-500 text-sm">Cannot transfer to yourself</p>
        )}
      </div>

      {/* Warning Box */}
      {isOwner === true && (
        <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-xl">⚠️</span>
            <div className="text-yellow-200">
              <p className="font-medium mb-1">Transfer Warning</p>
              <p className="text-sm">
                This action will permanently transfer ownership of &quot;{name}&quot; to the specified address. 
                You will no longer be able to manage this name after the transfer is complete.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Button */}
      <button
        onClick={transferName}
        disabled={
          !name.trim() ||
          !newOwner.trim() ||
          !isValidAddress(newOwner) ||
          !isOwner ||
          transferring ||
          (address && newOwner.toLowerCase() === address.toLowerCase())
        }
        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
      >
        {transferring ? 'Transferring...' : 'Transfer Name'}
      </button>
    </div>
  );
};