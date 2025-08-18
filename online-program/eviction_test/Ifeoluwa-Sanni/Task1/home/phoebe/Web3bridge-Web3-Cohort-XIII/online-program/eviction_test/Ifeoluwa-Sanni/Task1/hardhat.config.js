require("@nomicfoundation/hardhat-toolbox");
const { vars } = require("hardhat/config");

module.exports = {
  solidity: "0.8.28",
  defaultNetwork: "liskSepolia",

  networks: {  
    liskSepolia: {
      url: "https://rpc.sepolia-api.lisk.com",
      accounts: vars.has("PRIVATE_KEY") ? [vars.get("PRIVATE_KEY")] : [],
      chainId: 4202,
      gasPrice: 1000000000,
    },
  },

  etherscan: {
    apiKey: vars.get("ETHERSCAN_API_KEY"),
    customChains: [
      {
        network: "liskSepolia",
        chainId: 4202,
        urls: {
          apiURL: "https://sepolia-blockscout.lisk.com/api",
          browserURL: "https://sepolia-blockscout.lisk.com",
        },
      },
    ],
  },
};