import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PiggyBankModule = buildModule("PiggyBankModule", (m) => {
  // Deploy the PiggyBankFactory contract
  const piggyBankFactory = m.contract("PiggyBankFactory");

  // Create a test savings account using the factory
  const createSavingsAccount = m.call(piggyBankFactory, "createSavingsAccount");

  // Optional: Set up parameters for future use
  const initialLockPeriod = m.getParameter("initialLockPeriod", 30); // 30 days default
  const minSavingsAmount = m.getParameter("minSavingsAmount", "0.01"); // 0.01 ETH default

  return {
    piggyBankFactory,
    createSavingsAccount,
    initialLockPeriod,
    minSavingsAmount,
  };
});

export default PiggyBankModule;