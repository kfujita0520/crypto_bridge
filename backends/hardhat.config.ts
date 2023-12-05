import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const solidityConfig = {
  compilers: [
    {
      version: '0.8.20',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  ],
};

const config: HardhatUserConfig = {
  solidity: solidityConfig,
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
  }
};

export default config;
