const MultisigProxy = artifacts.require('./OneInchMultisigProxy');

const fromWei = web3.utils.fromWei;
const toWei = web3.utils.toWei;
const toBN = web3.utils.toBN;
const BN = web3.utils.BN;

const ethAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const usdcAddr = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const daiAddr = '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643'
const uniAdd = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';

async function createTx({ fromToken, toToken, amount, minReturn, maxGas, period, fromAccount }) {
  const multisigProxy = await MultisigProxy.deployed();

  const createEvent = multisigProxy.create(
    fromToken || ethAddr,
    toToken || daiAddr,
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

  const r1 = await multisigProxy._returnAmount();
  console.log(r1.toString());
  await multisigProxy.execute(
    toBN(`${id}`),
    { from: fromAccount }
  );
  const r2 = await multisigProxy._returnAmount();
  console.log(r2.toString());
}

async function main() {
  const accounts = await web3.eth.getAccounts();
  await createTx({ amount: 1, minReturn: 500, fromAccount: accounts[0] });

  const { id } = await createTx({ amount: 2, minReturn: 500, fromAccount: accounts[0] });
  console.log(id.toString());

  await executeTx({ id, fromAccount: accounts[0] }) ;
}

module.exports = async (callback) => {
  main().then(() => callback()).catch(err => callback(err))
}
