const HDWalletProvider = require("truffle-hdwallet-provider");
const fs = require('fs');
const path = require("path");
let secrets;

if (fs.existsSync('./secret.json')) {
  secrets = JSON.parse(fs.readFileSync('./secret.json', 'utf8'));
}

module.exports = {
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  networks: {
    development: {
      network_id: "*",
      host: 'localhost',
      port: 8545
    },
    rinkeby: {
      network_id: "4",
      provider: function() {
        return new HDWalletProvider(secrets.mnemonic, "https://rinkeby.infura.io/v3/" + secrets.infuraApiKey);
      }
    },
    mainnet: {
      network_id: "1",
      provider: function() {
        return new HDWalletProvider(secrets.mnemonic, "https://mainnet.infura.io/v3/" + secrets.infuraApiKey);
      }
    }
  }
};
