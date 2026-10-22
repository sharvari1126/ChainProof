require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // "paris" keeps the bytecode compatible with every EVM chain/tooling version
      evmVersion: "paris",
    },
  },
  networks: {
    // `npx hardhat node` listens here. chainId 31337 is Hardhat's default.
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
};
