//This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const multiwalletModule = buildModule("multiwalletModule", (m) => {
  
  // Define the constructor parameters
  const owners = m.getParameter("owners", [
    "0x63E5a246937549b3ECcBB410AF42da54F999D172", 
    "0x3F01E90459c9931B2ff9a40BF81933273e7ea209", 
    "0x8B3ecF29f52c6C4943dbAD4f34D8b79077C238dd"  
  ]);
  
  const requiredConfirmations = m.getParameter("requiredConfirmations", 2);

  
  const MultiSigWallet = m.contract("MultiSigWallet", [owners, requiredConfirmations]);

  return { MultiSigWallet };
});

export default multiwalletModule;