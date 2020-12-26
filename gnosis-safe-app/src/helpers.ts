import Web3 from 'web3';
import axios from 'axios';
import { toWei, toBN, isAddress } from 'web3-utils';

import OneInchOrderProxy from './contracts/OneInchOrderProxy.json';
import IERC20 from './contracts/IERC20Detailed.json';

const INFURA_ID = process.env.REACT_APP_INFURA_ID;

const web3 = new Web3(`https://rinkeby.infura.io/v3/${INFURA_ID}`);

export const defaultToken = {
  address: '',
  decimals: 0,
  logoURI: '',
  name: '',
  symbol: '',
  balance: 0,
  allowance: 0
};

export const getContract = async (contract: any) => {
  const networkId = await web3.eth.net.getId();
  const deployedNetwork = contract.networks[networkId];
  const instance = new web3.eth.Contract(
    contract.abi,
    deployedNetwork?.address,
  );

  return instance;
}

export const fetchOneInchList = async () => {
  const { data } = await axios.get('https://api.1inch.exchange/v2.0/tokens');
  return data.tokens;
}

export const getTokenAndBalance = async (address: string, safeAddr: string) => {
  if (!isAddress(address)) {
    return { ...defaultToken, address };
  }

  const tokensList = await fetchOneInchList();
  const token = tokensList[address.toLowerCase()];

  if (token?.symbol === 'ETH') {
    const balance = await web3.eth.getBalance(safeAddr);
    return { ...token, balance };
  }

  const contract = await getContract(OneInchOrderProxy);
  const erc20Contract = new web3.eth.Contract(IERC20.abi as any, address);
  const decimals = await erc20Contract.methods.decimals().call();
  const balance = await erc20Contract.methods.balanceOf(safeAddr).call();
  const allowance = await erc20Contract.methods.allowance(safeAddr, contract.options.address).call();

  if (token)
    return { ...token, balance, allowance };
  else
    return { ...defaultToken, address, decimals, balance, allowance };
}

export const prepareApproveTx = async (srcToken, srcAmount) => {
  const contract = await getContract(OneInchOrderProxy);
  const erc20Contract = new web3.eth.Contract(IERC20.abi as any, srcToken.address);

  const data = erc20Contract.methods.approve(
    contract.options.address,
    toBN(srcAmount * Math.pow(10, srcToken.decimals)),
  ).encodeABI();

  return {
    to: srcToken.address,
    value: '0',
    data
  };
}

export const prepareSubmitTx = async (srcToken, dstToken, srcAmount, minDstAmount, reward) => {
  const contract = await getContract(OneInchOrderProxy);

  const data = contract.methods.create(
    srcToken.address,
    dstToken.address,
    toBN(srcAmount * Math.pow(10, srcToken.decimals)),
    toBN(minDstAmount * Math.pow(10, dstToken.decimals)),
    toBN(3 * 24 * 60 * 60)
  ).encodeABI();

  const value = srcToken.name === 'Ethereum'
    ? toWei(`${Number(srcAmount) + Number(reward)}`)
    : toWei(`${reward}`);

  return {
    to: contract.options.address,
    value: value.toString(),
    data
  };
}
