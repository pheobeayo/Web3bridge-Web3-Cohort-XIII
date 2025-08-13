// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenGatedDAOModule = buildModule("TokenGatedDAOModule", (m) => {
  // Deploy the ERC7432 role contract first (you'll need to provide the actual contract name)
 
  const roleContract = m.contract("ERC7432", []);

  // Deploy the DAO Membership NFT contract
  
  const membershipNFT = m.contract("DAOMembershipNFT", []);

  // Deploy the TokenGatedDAO contract with the addresses of the dependencies
  const tokenGatedDAO = m.contract("TokenGatedDAO", [
    roleContract,
    membershipNFT
  ]);

  return { 
    roleContract,
    membershipNFT,
    tokenGatedDAO 
  };
});

export default TokenGatedDAOModule;