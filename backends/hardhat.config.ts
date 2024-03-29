import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

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
      allowUnlimitedContractSize: true,
      chainId: 31337,
      forking: {
        url: process.env.ETHEREUM_SEPOLIA_RPC_URL !== undefined ? process.env.ETHEREUM_SEPOLIA_RPC_URL : '', // replace with your Infura project ID
        blockNumber: 4841158, // replace with the block number you want to fork from
      },
      // forking: {
      //   url: process.env.POLYGON_MUMBAI_RPC_URL !== undefined ? process.env.POLYGON_MUMBAI_RPC_URL : '', // replace with your Infura project ID
      //   blockNumber: 43293628, // replace with the block number you want to fork from
      // },
    },
    ethereumSepolia: {
      url: process.env.ETHEREUM_SEPOLIA_RPC_URL !== undefined ? process.env.ETHEREUM_SEPOLIA_RPC_URL : '',
      accounts: process.env.PRIVATE_KEY !== undefined && process.env.PRIVATE_KEY2 !== undefined ?
          [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2] : [],
      chainId: 11155111,
      gas: 12000000
    },
    polygonMumbai: {
      url: process.env.POLYGON_MUMBAI_RPC_URL !== undefined ? process.env.POLYGON_MUMBAI_RPC_URL : '',
      accounts: process.env.PRIVATE_KEY !== undefined && process.env.PRIVATE_KEY2 !== undefined ?
          [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY2] : [],
      chainId: 80001
    },
    // optimismGoerli: {
    //   url: process.env.OPTIMISM_GOERLI_RPC_URL !== undefined ? process.env.OPTIMISM_GOERLI_RPC_URL : '',
    //   accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    //   chainId: 420,
    // },
    // arbitrumTestnet: {
    //   url: process.env.ARBITRUM_TESTNET_RPC_URL !== undefined ? process.env.ARBITRUM_TESTNET_RPC_URL : '',
    //   accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    //   chainId: 421613
    // },
    // avalancheFuji: {
    //   url: process.env.AVALANCHE_FUJI_RPC_URL !== undefined ? process.env.AVALANCHE_FUJI_RPC_URL : '',
    //   accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    //   chainId: 43113
    // }
  },
  etherscan: {
    customChains: [
      {
        network: "ethereumSepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io"
        }
      }
    ],
    apiKey: {
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || '',
      ethereumSepolia: process.env.ETHERSCAN_API_KEY || '',
    },
  },
};


export default config;
