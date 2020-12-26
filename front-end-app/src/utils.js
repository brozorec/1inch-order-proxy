import getWeb3 from './getWeb3';
import axios from 'axios';
import { fromWei } from 'web3-utils';

export const getContract = async (contract) => {
  const web3 = await getWeb3();
  const networkId = await web3.eth.net.getId();
  const deployedNetwork = contract.networks[networkId];
  const instance = new web3.eth.Contract(
    contract.abi,
    deployedNetwork && deployedNetwork.address,
  );

  return instance;
}

export const formatDate = (date) =>
  date.toLocaleString({}, {
    month: 'short',
    day: '2-digit',
    year: '2-digit',
    hour: 'numeric',
    minute: 'numeric'
  });

export const formatAccount = (account) =>
  account ? account.slice(0, 7) + '....' + account.slice(-4) : ''

export const prepareOrder = async (params, id, contractAddr) => {
  const { data } = await axios.get('https://api.1inch.exchange/v2.0/swap', {
    params: {
      fromTokenAddress: params.srcToken,
      toTokenAddress: params.dstToken,
      amount: params.srcAmount,
      destReceiver: params.beneficiary,
      fromAddress: contractAddr,
      slippage: 1
    },
    validateStatus: (status) => status >= 200 && status <= 500
  });

  const formatToken = (token, amount) => ({
    ...token,
    amount: Number(amount) / Math.pow(10, token.decimals)
  });

  if (data.errors) {
    console.log(data.errors);
    // TODO
    return null;
  }
  return {
    id,
    beneficiary: formatAccount(params.beneficiary),
    reward: fromWei(params.execReward),
    exp: formatDate(new Date(params.expiration * 1e3)),
    fromToken: formatToken(data.fromToken, params.srcAmount),
    toToken: formatToken(data.toToken, params.minReturnAmount),
    gas: data.tx.gas,
    gasPrice: fromWei(data.tx.gasPrice, 'gwei'),
    callData: data.tx.data
  }
};
