const OrderProxy = artifacts.require('./OneInchOrderProxy');
const IERC20 = artifacts.require('./IERC20');
const axios = require('axios').default;

const fromWei = web3.utils.fromWei;
const toWei = web3.utils.toWei;
const toBN = web3.utils.toBN;
const BN = web3.utils.BN;

const eth = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const usdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
const uni = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
const esd = '0x36f3fd68e7325a35eb768f1aedaae9ea0689d723';

const userAddr = '0x2f71129b240080C638ac8d993BFF52169E3551c3';
const oneInchAddr = '0x111111125434b319222CdBf8C261674aDB56F3ae';
// ganache-cli should be called with --unlock userAddr,ERC20
// userAddr needs to have ETH, enough ERC20 and should have approved
// ERC20 on oneInch for enough amount

const ERC20 = usdc;

const REWARD_AMOUNT = 0.05;
const ERC20Contract = new web3.eth.Contract(IERC20.abi, ERC20);

const createETHToTokenTx = async ({ dstToken, srcAmount, minReturn, period, user } = {}) => {
  const orderProxy = await OrderProxy.deployed();
  const createEvent = await orderProxy.create(
    eth,
    dstToken,
    toBN(toWei(`${srcAmount || 1}`)),
    toBN(`${minReturn}`),
    toBN(`${(period || 1) * 24 * 60 * 60}`),
    { from: user, value: toWei(`${(srcAmount + REWARD_AMOUNT) || 1.05}`) }
  )
    .then((x) => x.logs.find((x) => x.event == "Create"))
    .then((x) => (x ? x.args : null));

  return createEvent;
}

const createTokenToTokenTx = async ({ srcToken, dstToken, srcAmount, minReturn, period, user } = {}) => {
  const orderProxy = await OrderProxy.deployed();
  const createEvent = await orderProxy.create(
    srcToken,
    dstToken,
    toBN("10000000"),
    toBN(`${minReturn}`),
    toBN(`${(period || 1) * 24 * 60 * 60}`),
    { from: user, value: toWei(`${REWARD_AMOUNT}`) }
  )
    .then((x) => x.logs.find((x) => x.event == "Create"))
    .then((x) => (x ? x.args : null));

  return createEvent;
}

async function executeTx({ id, calldata, fromAccount }) {
  const orderProxy = await OrderProxy.deployed();

  await orderProxy.execute(
    toBN(`${id}`),
    calldata,
    { from: fromAccount }
  );
}

async function tokenToToken() {
  const accounts = await web3.eth.getAccounts();

  //let balInit = await ERC20Contract.methods.balanceOf(accounts[0]).call();
  //console.log('init:');
  //console.log(balInit.toString());

  await ERC20Contract.methods
    .transfer(accounts[0], '10000000')
    .send({ from: userAddr });

  const params = {
    srcToken: ERC20, dstToken: uni, srcAmount: 2, minReturn: 1000, period: 2, user: accounts[0]
  };
  
  const approval = await ERC20Contract.methods
    .approve(OrderProxy.address, '10000000')
    .send({ from: accounts[0] });
  console.log(`Approval transaction hash: ${approval.transactionHash}`);

  let balBefore = await ERC20Contract.methods.balanceOf(params.user).call();
  console.log('before:');
  console.log(balBefore.toString());
  console.log('======');

  const { id } = await createTokenToTokenTx(params);
  console.log('TX created: ' + id.toString());

  const { data } = await axios.get('https://api.1inch.exchange/v2.0/swap', {
    params: {
      fromTokenAddress: params.srcToken,
      toTokenAddress: params.dstToken,
      amount: '10000000',
      destReceiver: params.user,
      //amount: toWei(`${params.srcAmount}`),
      fromAddress: userAddr,
      slippage: 1
    }
  });
  //console.log(data)
  //console.log(OrderProxy.address);

  //const contract = OrderProxy.address.slice(2).toLowerCase();
  //const replaced = data.tx.data.replace(/2f71129b240080c638ac8d993bff52169e3551c3/g, contract);

  await executeTx({ id, calldata: data.tx.data, fromAccount: accounts[0] }) ;
  
  console.log('======');
  let balAfter = await ERC20Contract.methods.balanceOf(params.user).call();
  console.log('after:');
  console.log(balAfter.toString());

  const inst = new web3.eth.Contract(IERC20.abi, uni);
  const balUniBefore = await inst.methods.balanceOf(params.user).call();
  console.log(balUniBefore);
}

async function ethToToken() {
  const accounts = await web3.eth.getAccounts();
  const params = {
    srcToken: eth, dstToken: ERC20, srcAmount: 2, minReturn: 131862329, period: 2, user: accounts[1]
  };

  const { data } = await axios.get('https://api.1inch.exchange/v2.0/swap', {
    params: {
      fromTokenAddress: params.srcToken,
      toTokenAddress: params.dstToken,
      amount: toWei(`${params.srcAmount}`),
      destReceiver: params.user,
      fromAddress: userAddr,
      slippage: 1
    }
  });

  let balBefore = await ERC20Contract.methods.balanceOf(params.user).call();
  console.log('before:');
  console.log(balBefore.toString());
  console.log('======');

  const { id } = await createETHToTokenTx(params);
  console.log('TX created: ' + id.toString());

  await executeTx({ id, calldata: data.tx.data, fromAccount: accounts[2] }) ;
  
  console.log('======');
  let balAfter = await ERC20Contract.methods.balanceOf(params.user).call();
  console.log('after:');
  console.log(balAfter.toString());
}

async function checkDecoding() {
  const orderProxy = await OrderProxy.deployed();
  const accounts = await web3.eth.getAccounts();
  const params = {
    srcToken: eth, dstToken: ERC20, srcAmount: 2, minReturn: 1000, period: 2, user: accounts[0]
  };

  const { data } = await axios.get('https://api.1inch.exchange/v2.0/swap', {
    params: {
      fromTokenAddress: params.srcToken,
      toTokenAddress: params.dstToken,
      destReceiver: params.user,
      amount: toWei(`${params.srcAmount}`),
      fromAddress: userAddr,
      slippage: 1
    }
  });

  const { id } = await orderProxy._decode_(data.tx.data);

  const minReturnAmount = await orderProxy._minReturnAmount();
  console.log(minReturnAmount.toString());
  const guaranteedAmount = await orderProxy._guaranteedAmount();
  console.log(guaranteedAmount.toString());
}

async function main() {
  await ethToToken();
  await tokenToToken();
  //await checkDecoding();
}

module.exports = async (callback) => {
  main().then(() => callback()).catch(err => callback(err))
}
