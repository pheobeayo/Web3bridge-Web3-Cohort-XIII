"use client";

import { Contract } from "ethers";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { pinata } from "@/utils/config";
import { MdSignalWifiStatusbarConnectedNoInternet } from "react-icons/md";
import { truncateAddr } from "@/utils/utils";
import { getENSContract } from "./services";
import { RegisterName } from "./components/shared/registerName";
import { OwnedNamesDisplay } from "./components/shared/ownedNames";
import { UpdateImage } from "./components/shared/updateImage";
import { UpdateAddress } from "./components/shared/updateAddress";
import { TransferName } from "./components/shared/transferName";
import Wrapper from "./components/shared/wrapper";
import { Search, User, Image, RefreshCw, Send, Globe, Shield, Zap, Plus, CheckCircle, XCircle, Info, X } from 'lucide-react';

type ActiveTab = "register" | "check" | "owned" | "update-image" | "update-address" | "transfer";

export default function Home() {
  const [file, setFile] = useState<File | undefined>(undefined);
  const [, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [nameToCheck, setNameToCheck] = useState("");
  const [checkingName, setCheckingName] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const { isConnected, address } = useAccount();
  const [contract, setContract] = useState<Contract | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("register");

  // Initialize contract
  useEffect(() => {
    const initContract = async () => {
      const contractInstance: Contract = await getENSContract();
      setContract(contractInstance);
    };

    initContract();
  }, []);

  // Note: uploadFile function is kept but marked as used to avoid ESLint error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const uploadFile = async () => {
    if (!file) {
      alert("No file selected");
      return;
    }

    try {
      setUploading(true);
      const urlRequest = await fetch("/api/url");
      const urlResponse = await urlRequest.json();
      const upload = await pinata.upload.public.file(file).url(urlResponse.url);
      const fileUrl = await pinata.gateways.public.convert(upload.cid);
      setUrl(fileUrl);
      setUploading(false);
    } catch (e) {
      console.log(e);
      setUploading(false);
      alert("Trouble uploading file");
    }
  };

  // Note: handleChange function is kept but marked as used to avoid ESLint error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target?.files?.[0]);
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleNameClick = (name: string) => {
    console.log('Clicked name:', name);
    setMessage({
      type: 'info',
      text: `Viewing details for "${name}"`
    });
  };

  const checkNameAvailability = async () => {
    if (!contract || !nameToCheck.trim()) return;

    try {
      setCheckingName(true);
      const available = await contract.isNameAvailable(nameToCheck.trim());
      setNameAvailable(available);
      setCheckingName(false);
    } catch (error) {
      console.error('Name check error:', error);
      setCheckingName(false);
      handleError('Failed to check name availability');
    }
  };

  const handleRegistrationSuccess = (name: string, txHash: string) => {
    setMessage({
      type: "success",
      text: `Successfully registered "${name}"! Transaction: ${truncateAddr(txHash)}`,
    });
    setActiveTab("owned");
  };

  const handleUpdateSuccess = (type: string, name: string, txHash: string, extra?: string) => {
    let text = "";
    switch (type) {
      case "image":
        text = `Successfully updated image for "${name}"!`;
        break;
      case "address":
        text = `Successfully updated address for "${name}" to ${truncateAddr(extra!)}`;
        break;
      case "transfer":
        text = `Successfully transferred "${name}" to ${truncateAddr(extra!)}`;
        break;
    }
    setMessage({
      type: "success",
      text: `${text} Transaction: ${truncateAddr(txHash)}`,
    });
  };

  const handleError = (error: string) => {
    setMessage({
      type: "error",
      text: error,
    });
  };

  const tabs = [
    {
      id: "register" as ActiveTab,
      label: "Register",
      icon: Plus,
      gradient: "from-emerald-500 to-teal-600",
      description: "Claim your unique name"
    },
    {
      id: "check" as ActiveTab,
      label: "Search",
      icon: Search,
      gradient: "from-blue-500 to-cyan-600",
      description: "Check availability"
    },
    {
      id: "owned" as ActiveTab,
      label: "My Names",
      icon: User,
      gradient: "from-purple-500 to-violet-600",
      description: "Manage your collection"
    },
    {
      id: "update-image" as ActiveTab,
      label: "Avatar",
      icon: Image,
      gradient: "from-pink-500 to-rose-600",
      description: "Update profile image"
    },
    {
      id: "update-address" as ActiveTab,
      label: "Address",
      icon: RefreshCw,
      gradient: "from-orange-500 to-amber-600",
      description: "Change resolver"
    },
    {
      id: "transfer" as ActiveTab,
      label: "Transfer",
      icon: Send,
      gradient: "from-indigo-500 to-blue-600",
      description: "Send to another wallet"
    },
  ];

  if (!isConnected) {
    return (

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 text-center max-w-md mx-auto shadow-2xl">
          <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center backdrop-blur-sm border border-white/10">
            <MdSignalWifiStatusbarConnectedNoInternet className="text-blue-400 text-4xl" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Connect Wallet
          </h2>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Connect your Web3 wallet to access the ENS Manager and start building your decentralized identity.
          </p>
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-4 border border-blue-500/20">
            <p className="text-blue-300 text-sm">
              You&apos;ll need a Web3 wallet like MetaMask to get started
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Wrapper className="flex flex-col w-full h-[calc(100%-80px)] py-8 gap-8">
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto p-6 pt-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl rounded-full px-6 py-3 border border-white/10 mb-6">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300 font-medium">Connected to {truncateAddr(address)}</span>
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full px-3 py-1 text-xs text-blue-300 border border-blue-500/20">
                Lisk Sepolia
              </div>
            </div>

            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent leading-tight">
              ENS Manager
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              Your gateway to decentralized naming. Register, manage, and customize your blockchain identity.
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-xl">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Secure</p>
                    <p className="text-gray-400 text-sm">Blockchain verified</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-xl">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Fast</p>
                    <p className="text-gray-400 text-sm">Instant resolution</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-xl">
                    <Globe className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Global</p>
                    <p className="text-gray-400 text-sm">Worldwide access</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className="mb-8 max-w-4xl mx-auto">
              <div className={`bg-white/5 backdrop-blur-xl rounded-2xl p-4 border ${message.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10"
                : message.type === "error"
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-blue-500/30 bg-blue-500/10"
                } animate-in slide-in-from-top duration-500`}>
                <div className="flex items-center gap-3">
                  {message.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                  {message.type === "error" && <XCircle className="w-5 h-5 text-red-400" />}
                  {message.type === "info" && <Info className="w-5 h-5 text-blue-400" />}
                  <p className={`flex-1 font-medium ${message.type === "success" ? "text-emerald-300" :
                    message.type === "error" ? "text-red-300" : "text-blue-300"
                    }`}>
                    {message.text}
                  </p>
                  <button
                    onClick={() => setMessage(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12 max-w-6xl mx-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative p-6 rounded-3xl transition-all duration-300 transform hover:scale-105 ${isActive
                    ? "bg-white/10 backdrop-blur-xl border-2 border-white/20 shadow-2xl"
                    : "bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20"
                    }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-4 rounded-2xl transition-all duration-300 ${isActive
                      ? `bg-gradient-to-br ${tab.gradient} shadow-lg`
                      : "bg-white/10 group-hover:bg-white/20"
                      }`}>
                      <IconComponent className={`w-6 h-6 ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                        }`} />
                    </div>
                    <div className="text-center">
                      <h3 className={`font-bold ${isActive ? "text-white" : "text-gray-300 group-hover:text-white"
                        }`}>
                        {tab.label}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 group-hover:text-gray-400 transition-colors">
                        {tab.description}
                      </p>
                    </div>
                  </div>

                  {isActive && (
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 animate-pulse"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">

              {/* Register Tab */}
              {activeTab === 'register' && (
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl mb-4">
                      <Plus className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Register New Name</h2>
                    <p className="text-gray-400">Secure your unique identity on the blockchain</p>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-500/20 mb-6">
                    <h4 className="text-emerald-300 font-semibold mb-3">Registration Benefits</h4>
                    <ul className="space-y-2 text-gray-300">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Replace complex addresses with simple names</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Receive payments to yourname.eth</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Build your decentralized identity</span>
                      </li>
                    </ul>
                  </div>

                  <RegisterName
                    contract={contract}
                    onSuccess={handleRegistrationSuccess}
                    onError={handleError}
                  />
                </div>
              )}

              {/* Search Tab */}
              {activeTab === 'check' && (
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl mb-4">
                      <Search className="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Search Names</h2>
                    <p className="text-gray-400">Check if your desired name is available</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={nameToCheck}
                          onChange={(e) => {
                            setNameToCheck(e.target.value);
                            setNameAvailable(null);
                          }}
                          placeholder="Search for a name"
                          className="w-full px-6 py-4 bg-white/5 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-300 text-lg"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                          .ens
                        </div>
                      </div>
                      <button
                        onClick={checkNameAvailability}
                        disabled={!nameToCheck.trim() || checkingName}
                        className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:opacity-50"
                      >
                        {checkingName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Checking
                          </div>
                        ) : (
                          'Search'
                        )}
                      </button>
                    </div>

                    {nameAvailable === true && (
                      <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-2xl p-6 animate-in fade-in duration-500">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-500/20 rounded-full">
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                            <h4 className="text-emerald-300 font-bold text-lg">Available!</h4>
                            <p className="text-emerald-200">&quot;{nameToCheck}.ens&quot; is ready to register</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {nameAvailable === false && (
                      <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-2xl p-6 animate-in fade-in duration-500">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-red-500/20 rounded-full">
                            <XCircle className="w-6 h-6 text-red-400" />
                          </div>
                          <div>
                            <h4 className="text-red-300 font-bold text-lg">Taken</h4>
                            <p className="text-red-200">&quot;{nameToCheck}.ens&quot; is already registered</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* My Names Tab */}
              {activeTab === 'owned' && (
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-2xl mb-4">
                      <User className="w-8 h-8 text-purple-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">My Names</h2>
                    <p className="text-gray-400">Manage your registered names</p>
                  </div>

                  <OwnedNamesDisplay
                    contract={contract}
                    onError={handleError}
                    onNameClick={handleNameClick}
                  />
                </div>
              )}

              {/* Update Image Tab */}
              {activeTab === 'update-image' && (
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-2xl mb-4">
                      <Image className="w-8 h-8 text-pink-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Update Avatar</h2>
                    <p className="text-gray-400">Update profile image for your names</p>
                  </div>

                  <UpdateImage
                    contract={contract}
                    userAddress={address}
                    onSuccess={(name, txHash) => handleUpdateSuccess('image', name, txHash)}
                    onError={handleError}
                  />
                </div>
              )}

              {/* Update Address Tab */}
              {activeTab === 'update-address' && (
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-2xl mb-4">
                      <RefreshCw className="w-8 h-8 text-orange-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Update Address</h2>
                    <p className="text-gray-400">Change resolver address for your names</p>
                  </div>

                  <UpdateAddress
                    contract={contract}
                    onSuccess={(name, newAddress, txHash) => handleUpdateSuccess('address', name, txHash, newAddress)}
                    onError={handleError}
                  />
                </div>
              )}

              {/* Transfer Tab */}
              {activeTab === 'transfer' && (
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-2xl mb-4">
                      <Send className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Transfer Name</h2>
                    <p className="text-gray-400">Send your names to another wallet</p>
                  </div>

                  <TransferName
                    contract={contract}
                    onSuccess={(name, newOwner, txHash) => handleUpdateSuccess('transfer', name, txHash, newOwner)}
                    onError={handleError}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>ENS Manager</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Secure
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Fast
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Decentralized
              </span>
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}