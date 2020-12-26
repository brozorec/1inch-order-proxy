require('dotenv').config();

const HDWalletProvider = require("@truffle/hdwallet-provider")
const infuraKey = process.env.INFURA_KEY;
const pk = [process.env.PK]

module.exports = {
  // Uncommenting the defaults below 
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    test: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(pk, `https://rinkeby.infura.io/v3/${infuraKey}`),
      network_id: 4,
      // gas: 7000000,
      // confirmations: 1,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider(pk, `https://mainnet.infura.io/v3/${infuraKey}`),
      network_id: 1,
      gasPrice: 31000000000,
      // gas: 7000000,
      // confirmations: 1,
      timeoutBlocks: 200,
      skipDryRun: false
    }
  },
  compilers: {
    solc: {
      version: "0.6.12",
      settings: {
        optimizer: { enabled: true, runs: 200 },
        evmVersion: "istanbul"
      }
    }
  }
};
