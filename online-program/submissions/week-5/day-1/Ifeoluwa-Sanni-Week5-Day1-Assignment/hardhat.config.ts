import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";


const config: HardhatUserConfig = {
  solidity: "0.8.28",

  networks: {
    // for testnet
    'lisk-sepolia': {
      url: 'https://rpc.sepolia-api.lisk.com',
      accounts: [vars.get("PRIVATE_KEY") as string],
      gasPrice: 1000000000,
    },
  },

  etherscan: {
    apiKey: {
      "lisk-sepolia": "123"
    },
    customChains: [
      {
        network: "lisk-sepolia",
        chainId: 4202,
        urls: {
          apiURL: "https://sepolia-blockscout.lisk.com/api",
          browserURL: "https://sepolia-blockscout.lisk.com"
        },
      },
    ],
  },
  sourcify: {
    enabled: false
  },
};

export default config;
