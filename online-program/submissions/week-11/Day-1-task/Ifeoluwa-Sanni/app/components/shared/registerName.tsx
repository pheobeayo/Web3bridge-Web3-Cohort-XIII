import React, { useState } from 'react';
import { Contract } from 'ethers';
import Image from 'next/image';
import { pinata } from '@/utils/config';

interface RegisterNameProps {
  contract: Contract | null;
  onSuccess?: (name: string, txHash: string) => void;
  onError?: (error: string) => void;
}

export const RegisterName: React.FC<RegisterNameProps> = ({
  contract,
  onSuccess,
  onError,
}) => {
  // Form states
  const [name, setName] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [file, setFile] = useState<File>();
  const [imageUrl, setImageUrl] = useState('');
  
  // Loading states
  const [uploading, setUploading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  
  // Status states
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [imageHash, setImageHash] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target?.files?.[0]);
    // Reset image states when new file is selected
    setImageUrl('');
    setImageHash('');
  };

  const uploadImage = async () => {
    if (!file) {
      onError?.('Please select an image file');
      return;
    }

    try {
      setUploading(true);
      
      // Get signed URL for upload
      const urlRequest = await fetch('/api/url');
      const urlResponse = await urlRequest.json();
      
      // Upload file to Pinata
      const upload = await pinata.upload.public.file(file).url(urlResponse.url);
      const fileUrl = await pinata.gateways.public.convert(upload.cid);
      
      setImageUrl(fileUrl);
      setImageHash(upload.cid);
      setUploading(false);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      onError?.('Failed to upload image. Please try again.');
    }
  };

  const checkNameAvailability = async () => {
    if (!contract || !name.trim()) return;

    try {
      setCheckingAvailability(true);
      const available = await contract.isNameAvailable(name.trim());
      setNameAvailable(available);
      setCheckingAvailability(false);
    } catch (error) {
      console.error('Availability check error:', error);
      setCheckingAvailability(false);
      onError?.('Failed to check name availability');
    }
  };

  const registerName = async () => {
    if (!contract) {
      onError?.('Contract not initialized');
      return;
    }

    if (!name.trim()) {
      onError?.('Please enter a name');
      return;
    }

    if (!targetAddress.trim()) {
      onError?.('Please enter a target address');
      return;
    }

    if (!imageHash) {
      onError?.('Please upload an image first');
      return;
    }

    if (nameAvailable === false) {
      onError?.('Name is not available');
      return;
    }

    try {
      setRegistering(true);
      
      // Call the registerName function on the contract
      const tx = await contract.registerName(
        name.trim(),
        imageHash,
        targetAddress.trim()
      );
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      setRegistering(false);
      onSuccess?.(name.trim(), receipt.transactionHash);
      
      // Reset form
      setName('');
      setTargetAddress('');
      setFile(undefined);
      setImageUrl('');
      setImageHash('');
      setNameAvailable(null);
      
    } catch (error: unknown) {
      console.error('Registration error:', error);
      setRegistering(false);
      
      // Handle different error types with proper type checking
      if (error && typeof error === 'object' && 'code' in error && error.code === 4001) {
        onError?.('Transaction rejected by user');
      } else if (error instanceof Error) {
        if (error.message.includes('Name already registered')) {
          onError?.('Name is already registered');
        } else if (error.message.includes('insufficient funds')) {
          onError?.('Insufficient funds for transaction');
        } else {
          onError?.(`Registration failed: ${error.message}`);
        }
      } else {
        onError?.('Registration failed. Please try again.');
      }
    }
  };

  // Validate Ethereum address format
  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">Register New Name</h2>
      
      {/* Name Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Name
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameAvailable(null); // Reset availability when name changes
            }}
            placeholder="Enter name (e.g., alice)"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            maxLength={64}
          />
          <button
            onClick={checkNameAvailability}
            disabled={!name.trim() || checkingAvailability}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm"
          >
            {checkingAvailability ? 'Checking...' : 'Check'}
          </button>
        </div>
        
        {/* Name availability status */}
        {nameAvailable === true && (
          <p className="text-green-500 text-sm">✓ Name is available</p>
        )}
        {nameAvailable === false && (
          <p className="text-red-500 text-sm">✗ Name is already taken</p>
        )}
      </div>

      {/* Target Address Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Target Address
        </label>
        <input
          type="text"
          value={targetAddress}
          onChange={(e) => setTargetAddress(e.target.value)}
          placeholder="0x..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
        {targetAddress && !isValidAddress(targetAddress) && (
          <p className="text-red-500 text-sm">Invalid Ethereum address format</p>
        )}
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Profile Image
        </label>
        <div className="flex gap-2">
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
          />
          <button
            onClick={uploadImage}
            disabled={!file || uploading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
        
        {/* Image preview */}
        {imageUrl && (
          <div className="mt-2">
            <p className="text-green-500 text-sm mb-2">✓ Image uploaded successfully</p>
            <div className="relative w-32 h-32 rounded-lg border border-gray-700 overflow-hidden">
              <Image
                src={imageUrl}
                alt="Uploaded preview"
                fill
                className="object-cover"
                sizes="128px"
              />
            </div>
          </div>
        )}
      </div>

      {/* Register Button */}
      <button
        onClick={registerName}
        disabled={
          !name.trim() ||
          !targetAddress.trim() ||
          !imageHash ||
          !isValidAddress(targetAddress) ||
          nameAvailable === false ||
          registering
        }
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
      >
        {registering ? 'Registering...' : 'Register Name'}
      </button>
    </div>
  );
};