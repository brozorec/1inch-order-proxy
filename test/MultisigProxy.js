const OneInchMultisigProxy = artifacts.require("OneInchMultisigProxy");
const ERC20ABI = require('./abi/erc20');

const toBN = web3.utils.toBN;
const fromWei = web3.utils.fromWei;
const toWei = web3.utils.toWei;

const eth = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const usdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
const uni = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
const esd = '0x36f3fd68e7325a35eb768f1aedaae9ea0689d723';

const userAddr = '0x2f71129b240080C638ac8d993BFF52169E3551c3';
// ganache-cli should be called with --unlock userAddr,ERC20
// userAddr needs to have ETH and enough ERC20

const ERC20 = esd;

const GAS_AMOUNT = 0.05;

contract('OneInchMultisigProxy', ([user1, user2, user3, _]) => {
  let MultisigProxy;
  let balanceRecord;
  let ERC20Contract = new web3.eth.Contract(ERC20ABI, ERC20);

  before(async () => {
    MultisigProxy = await OneInchMultisigProxy.deployed(); 

    balanceRecord = toBN(await web3.eth.getBalance(MultisigProxy.address));

    //await ERC20Contract.methods
      //.transfer(user1, toWei('100'))
      //.send({ from: userAddr });

    //const erc20Balance = await ERC20Contract.methods.balanceOf(user1).call();
    //assert(toBN(erc20Balance).gte(toBN(toWei('100'))));
  });

  const getBlockTimestamp = async () => {
    const blockN = await web3.eth.getBlockNumber();
    const block = await web3.eth.getBlock(blockN);

    return block.timestamp;
  }

  const createETHToTokenTx = async ({ dstToken, srcAmount, minReturn, period, user } = {}) => {
    const createEvent = await MultisigProxy.create(
      eth,
      dstToken,
      toBN(toWei(`${srcAmount || 1}`)),
      toBN(`${minReturn}`),
      toBN(`${(period || 1) * 24 * 60 * 60}`),
      { from: user, value: toWei(`${(srcAmount + GAS_AMOUNT) || 1.05}`) }
    )
      .then((x) => x.logs.find((x) => x.event == "Create"))
      .then((x) => (x ? x.args : null));

    assert.isNotNull(createEvent, "'Create' event has not been initialized");

    return createEvent;
  }

  const createTokenToETHTx = async ({ srcToken, srcAmount, minReturn, period, user } = {}) => {
    const createEvent = await MultisigProxy.create(
      srcToken,
      eth,
      toBN(toWei(`${srcAmount || 1}`)),
      toBN(`${minReturn}`),
      toBN(`${(period || 1) * 24 * 60 * 60}`),
      { from: user, value: toWei(`${GAS_AMOUNT}`) }
    )
      .then((x) => x.logs.find((x) => x.event == "Create"))
      .then((x) => (x ? x.args : null));

    assert.isNotNull(createEvent, "'Create' event has not been initialized");

    return createEvent;
  }

  const assertTx = async ({ id, srcToken, dstToken, srcAmount, minReturn, period, user }) => {
    const tx = await MultisigProxy.transactions(id);

    assert.equal(tx.srcToken, srcToken, 'Wrong srcToken');
    assert.equal(tx.dstToken, dstToken, 'Wrong dstToken');
    assert.equal(tx.srcAmount.toString(), toWei(`${srcAmount}`), 'Wrong srcAmount');
    assert.equal(tx.minDstAmount.toString(), `${minReturn}`, 'Wrong minDstAmount');
    assert.equal(tx.maxGasAmount.toString(), toWei(`${GAS_AMOUNT}`), 'Wrong maxGasAmount');
    assert.equal(tx.beneficiary, user, 'Wrong beneficiary');
    assert.equal(tx.state.toString(), '0', 'Wrong state');
    const timestamp = await getBlockTimestamp();
    assert.equal(
      tx.expiration.toString(),
      toBN(timestamp).add(toBN(`${period * 24 * 60 * 60}`)),
      'Wrong expiration'
    );
  }

  //it('should create ETH to Token transaction', async () => {
    //const params = { dstToken: ERC20, srcAmount: 2, minReturn: 1000, period: 2, user: user1 };
    //const { id } = await createETHToTokenTx(params);

    //await assertTx({ id, srcToken: eth, ...params });

    //const proxyBalance = await web3.eth.getBalance(MultisigProxy.address);
    //const toAdd = toBN(toWei(`${params.srcAmount + GAS_AMOUNT}`));
    //assert.equal(
      //proxyBalance,
      //balanceRecord.add(toAdd).toString(),
      //'MultisigProxy: wrong ETH balance'
    //);
    //balanceRecord = balanceRecord.add(toAdd);
  //});

  it('should execute ETH to Token transaction', async () => {
    const params = { dstToken: ERC20, srcAmount: 2, minReturn: 1000, period: 2, user: user1 };
    const { id } = await createETHToTokenTx(params);

    let erc20Balance = await ERC20Contract.methods.balanceOf(user1).call();
    console.log('before:');
    console.log(erc20Balance.toString());
    await MultisigProxy.execute(id);
    const r = await MultisigProxy._returnAmount();
    console.log(fromWei(r.toString()));
    erc20Balance = await ERC20Contract.methods.balanceOf(user1).call();
    console.log('after:');
    console.log(erc20Balance.toString());
  });

  //it('should create Token to ETH transaction', async () => {
    //const params = { srcToken: ERC20, srcAmount: 2, minReturn: 1000, period: 2, user: user1 };

    //await ERC20Contract.methods
      //.approve(MultisigProxy.address, toWei(`${params.srcAmount}`))
      //.send({ from: params.user });

    //const { id } = await createTokenToETHTx(params);

    //await assertTx({ id, dstToken: eth, ...params });

    //const proxyBalance = await web3.eth.getBalance(MultisigProxy.address);
    //const toAdd = toBN(toWei(`${GAS_AMOUNT}`));
    //assert.equal(
      //proxyBalance,
      //balanceRecord.add(toAdd).toString(),
      //'MultisigProxy: wrong ETH balance'
    //);
    //balanceRecord = balanceRecord.add(toAdd);

    //const erc20Balance = await ERC20Contract.methods.balanceOf(MultisigProxy.address).call();
    //assert.equal(erc20Balance.toString(), toWei(`${params.srcAmount}`));
  //});
});
