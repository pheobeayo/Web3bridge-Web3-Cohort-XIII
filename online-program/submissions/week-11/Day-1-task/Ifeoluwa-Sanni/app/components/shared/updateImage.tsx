import React, { useState, useEffect } from 'react';
import { Contract } from 'ethers';
import { pinata } from '@/utils/config';

interface UpdateImageProps {
  contract: Contract | null;
  userAddress?: string;
  onSuccess?: (name: string, txHash: string) => void;
  onError?: (error: string) => void;
}

export const UpdateImage: React.FC<UpdateImageProps> = ({
  contract,
  userAddress,
  onSuccess,
  onError,
}) => {
  // Form states
  const [selectedName, setSelectedName] = useState('');
  const [file, setFile] = useState<File | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState('');
  
  // Loading states
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [loadingNames, setLoadingNames] = useState(false);
  
  // Data states
  const [ownedNames, setOwnedNames] = useState<string[]>([]);
  const [imageHash, setImageHash] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState('');

  // Load user's owned names
  useEffect(() => {
    const loadOwnedNames = async () => {
      if (!contract || !userAddress) return;

      try {
        setLoadingNames(true);
        const names = await contract.getNamesOwnedBy(userAddress);
        setOwnedNames(names);
        setLoadingNames(false);
      } catch (error) {
        console.error('Error loading owned names:', error);
        setLoadingNames(false);
        onError?.('Failed to load your owned names');
      }
    };

    loadOwnedNames();
  }, [contract, userAddress, onError]);

  // Load current image when name is selected
  useEffect(() => {
    const loadCurrentImage = async () => {
      if (!contract || !selectedName) {
        setCurrentImageUrl('');
        return;
      }

      try {
        const [, , imageHash] = await contract.resolveName(selectedName);
        if (imageHash) {
          const fileUrl = await pinata.gateways.public.convert(imageHash);
          setCurrentImageUrl(fileUrl);
        } else {
          setCurrentImageUrl('');
        }
      } catch (error) {
        console.error('Error loading current image:', error);
        setCurrentImageUrl('');
      }
    };

    loadCurrentImage();
  }, [contract, selectedName]);

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

  const updateImage = async () => {
    if (!contract) {
      onError?.('Contract not initialized');
      return;
    }

    if (!selectedName) {
      onError?.('Please select a name');
      return;
    }

    if (!imageHash) {
      onError?.('Please upload a new image first');
      return;
    }

    try {
      setUpdating(true);
      
      // Call the updateImage function on the contract
      const tx = await contract.updateImage(selectedName, imageHash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      setUpdating(false);
      onSuccess?.(selectedName, receipt.transactionHash);
      
      // Reset form but keep selected name
      setFile(undefined);
      setImageUrl('');
      setImageHash('');
      
      // Reload current image to show the updated one
      const fileUrl = await pinata.gateways.public.convert(imageHash);
      setCurrentImageUrl(fileUrl);
      
    } catch (error: unknown) {
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
          onError?.('This name does not exist');
        } else if (message.includes('insufficient funds')) {
          onError?.('Insufficient funds for transaction');
        } else {
          onError?.('Update failed. Please try again.');
        }
      } else {
        onError?.('Update failed. Please try again.');
      }
    }
  };

  if (!userAddress) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Update Image</h2>
        <p className="text-gray-400">Please connect your wallet to update images.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">Update Image</h2>
      
      {/* Name Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Select Name to Update
        </label>
        {loadingNames ? (
          <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-400">
            Loading your names...
          </div>
        ) : ownedNames.length > 0 ? (
          <select
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select a name</option>
            {ownedNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-400">
            You don&apos;t own any names yet.
          </div>
        )}
      </div>

      {/* Current Image Display */}
      {selectedName && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Current Image
          </label>
          {currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt={`Current image for ${selectedName}`}
              className="w-32 h-32 object-cover rounded-lg border border-gray-700"
            />
          ) : (
            <div className="w-32 h-32 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
              <span className="text-gray-400 text-sm">No image</span>
            </div>
          )}
        </div>
      )}

      {/* New Image Upload */}
      {selectedName && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            New Image
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
          
          {/* New image preview */}
          {imageUrl && (
            <div className="mt-2">
              <p className="text-green-500 text-sm mb-2">✓ New image uploaded successfully</p>
              <img
                src={imageUrl}
                alt="New image preview"
                className="w-32 h-32 object-cover rounded-lg border border-gray-700"
              />
            </div>
          )}
        </div>
      )}

      {/* Update Button */}
      <button
        onClick={updateImage}
        disabled={
          !selectedName ||
          !imageHash ||
          updating ||
          ownedNames.length === 0
        }
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
      >
        {updating ? 'Updating Image...' : 'Update Image'}
      </button>
    </div>
  );
};