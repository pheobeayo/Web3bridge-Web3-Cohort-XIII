// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition


import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";



const DEFAULT_INITIAL_SUPPLY = 1_000_000;
const DEFAULT_LOCK_PERIOD_DAYS = 30;      
const SECONDS_PER_DAY = 24 * 60 * 60;

const StakingSystemModule = buildModule("StakingSystemModule", (m) => {
  
  const initialSupply = m.getParameter("initialSupply", DEFAULT_INITIAL_SUPPLY);
  const lockPeriodDays = m.getParameter("lockPeriodDays", DEFAULT_LOCK_PERIOD_DAYS);
  
  
  const lockPeriodSeconds = m.getParameter("lockPeriodSeconds", DEFAULT_LOCK_PERIOD_DAYS * SECONDS_PER_DAY);

  
  const tokenA = m.contract("TokenA", [initialSupply]);

  
  const tokenB = m.contract("TokenB", []);

  
  const stakingContract = m.contract("StakingContract", [
    tokenA,
    tokenB,
    lockPeriodSeconds
  ]);

  
  m.call(tokenB, "setStakingContract", [stakingContract]);

  
  const stakingFactory = m.contract("StakingFactory", []);

  return {
    tokenA,
    tokenB,
    stakingContract,
    stakingFactory
  };
});

export default StakingSystemModule;