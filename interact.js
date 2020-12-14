const MultisigProxy = artifacts.require('./OneInchMultisigProxy');
const IERC20 = artifacts.require('./IERC20');

const fromWei = web3.utils.fromWei;
const toWei = web3.utils.toWei;
const toBN = web3.utils.toBN;
const BN = web3.utils.BN;

const eth = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const usdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const dai = '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643'
const uni = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
const esd = '0x36f3fd68e7325a35eb768f1aedaae9ea0689d723'

async function createTx({ fromToken, toToken, amount, minReturn, maxGas, period, fromAccount }) {
  const multisigProxy = await MultisigProxy.deployed();

  const createEvent = multisigProxy.create(
    fromToken || eth,
    toToken || dai,
    toBN(`${minReturn}`),
    toBN(`${maxGas || 6000000}`),
    toBN(`${(period || 1) * 24 * 60 * 60}`),
    { from: fromAccount, value: web3.utils.toWei(`${amount}`, 'ether') }
  )
    .then((x) => x.logs.find((x) => x.event == "Create"))
    .then((x) => (x ? x.args : null));

  return createEvent;
}

async function executeTx({ id, fromAccount }) {
  const multisigProxy = await MultisigProxy.deployed();

  await multisigProxy.execute(
    toBN(`${id}`),
    { from: fromAccount }
  );
}

async function main() {
  const accounts = await web3.eth.getAccounts();

  await createTx({ amount: 1, minReturn: 500, toToken: esd, fromAccount: accounts[0] });

  const { id } = await createTx({ amount: 1, minReturn: 500, toToken: esd, fromAccount: accounts[0] });

  await executeTx({ id, fromAccount: accounts[0] }) ;

  const tokenInst = new web3.eth.Contract(IERC20.abi, esd);
  const bal = await tokenInst.methods.balanceOf(accounts[0]).call()
  console.log(bal);
}

module.exports = async (callback) => {
  main().then(() => callback()).catch(err => callback(err))
}
