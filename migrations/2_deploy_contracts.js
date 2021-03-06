const OneInchOrderProxy = artifacts.require('OneInchOrderProxy');
const UniERC20 = artifacts.require('UniERC20');

const addresses = {
  priceProvider: '0x169E633A2D1E6c10dD91238Ba11c4A708dfEF37C',
  oneSplit: '0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E',
  uniswapRouter: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  oneInchExchange: '0x111111125434b319222CdBf8C261674aDB56F3ae'
}

module.exports = async function(deployer) {
  await deployer.deploy(UniERC20);
  await deployer.link(UniERC20, OneInchOrderProxy);
  await deployer.deploy(
    OneInchOrderProxy,
    addresses.oneInchExchange
  );
};
