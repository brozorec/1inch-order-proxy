const HDWalletProvider = require("@truffle/hdwallet-provider")
const infuraKey = "f8481a1ed3b0466ead585fdbd71d8f95"
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
      network_id: 4, // Ropsten's id
      // gas: 7000000,        // Ropsten has a lower block limit than mainnet
      // confirmations: 1,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
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
