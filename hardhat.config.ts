import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-foundry";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Pull secrets from environment — never hardcode private keys
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL ?? "";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.34",
    settings: {
      optimizer: {
        enabled: true,   // reduces deployed contract size and gas cost
        runs: 200,       // 200 = balanced between deploy cost and call cost
      },
      // OZ v5.6+ uses the `mcopy` opcode which requires Cancun EVM or later.
      // Polygon mainnet upgraded to Cancun in Q1 2024 — safe to target here.
      evmVersion: "cancun",
    },
  },

  networks: {
    // Local Hardhat node — spun up with `npx hardhat node`
    // Used for fast iteration during development, no real funds needed
    localhost: {
      url: "http://127.0.0.1:8545",
    },

    // Polygon Mumbai testnet — public testnet, free MATIC from faucet
    // Used for staging before mainnet deployment
    mumbai: {
      url: MUMBAI_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 80001,  // Mumbai chain ID
    },

    // Polygon mainnet — only after third-party audit is complete
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 137,
    },
  },

  // Polygonscan verification — lets anyone read the contract source on-chain
  etherscan: {
    apiKey: {
      polygonMumbai: POLYGONSCAN_API_KEY,
      polygon: POLYGONSCAN_API_KEY,
    },
  },

  // Gas reporter — shows gas cost per function call when running tests
  // Enable with: REPORT_GAS=true npx hardhat test
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};

export default config;
