const OneInchMultisigProxy = artifacts.require('OneInchMultisigProxy');

const addresses = {
  priceProvider: '0x169E633A2D1E6c10dD91238Ba11c4A708dfEF37C',
  oneSplit: '0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E'
}

module.exports = function(deployer) {
  deployer.deploy(
    OneInchMultisigProxy,
    addresses.oneSplit,
    addresses.priceProvider
  );
};
