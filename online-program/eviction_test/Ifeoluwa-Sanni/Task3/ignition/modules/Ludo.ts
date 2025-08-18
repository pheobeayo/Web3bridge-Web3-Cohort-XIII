import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LudoModule", (m) => {
  const ludo = m.contract("LudoGame");

  m.call(ludo);

  return { ludo };
});