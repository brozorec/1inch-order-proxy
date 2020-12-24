import React, { useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button, Loader, Title, Text, TextField } from '@gnosis.pm/safe-react-components';
import Avatar from '@material-ui/core/Avatar';
import { useSafeAppsSDK } from '@gnosis.pm/safe-apps-react-sdk';
import { toBN, isAddress } from 'web3-utils';
import { defaultToken, getTokenAndBalance, prepareSubmitTx, prepareApproveTx } from './helpers'

const Container = styled.div`
  margin-bottom: 2rem;
  width: 100%;
  max-width: 480px;
  display: grid;
  grid-template-columns: 1fr;
  grid-column-gap: 1rem;
  grid-row-gap: 1rem;
`;

const TextFieldContainer = styled.div`
  align-items: center;
  display: flex;
  justify-content: left;
  margin-bottom: 17px;
`;

const CreateOrder: React.FC = () => {
  const { sdk, safe } = useSafeAppsSDK();

  const [disabled, setDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [needApproval, setNeedApproval] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [safeBlance, setSafeBalance] = useState('');

  const [srcToken, setSrcToken] = useState(defaultToken);
  const [dstToken, setDstToken] = useState(defaultToken);
  const [srcAmount, setSrcAmount] = useState('');
  const [minDstAmount, setMinDstAmount] = useState('');
  const [reward, setReward] = useState('');

  const handleAddress = async (setCb, value) => {
    const newToken = await getTokenAndBalance(value, safe.safeAddress);
    setCb(newToken);
  };

  const checkTx = async (safeTxHash) => {
    const safeTx = await sdk.txs.getBySafeTxHash(safeTxHash);
    if (!safeTx.isExecuted) {
      setTimeout(() => checkTx(safeTxHash), 1000);
    }
    else {
      setLoading(false);
      const token = await getTokenAndBalance(srcToken.address, safe.safeAddress);
      setSrcToken(token);
    }
  }

  const onSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const tx = await prepareSubmitTx(srcToken, dstToken, srcAmount, minDstAmount, reward);
      const { safeTxHash } = await sdk.txs.send({ txs: [ tx ] });

      console.log({ safeTxHash });
      checkTx(safeTxHash);
    }
    catch (e) {
      setLoading(false);
      console.error(e);
    }
  }, [sdk, srcToken, dstToken, srcAmount, minDstAmount, reward]);

  const onApproveLimit = useCallback(async () => {
    setLoading(true);
    try {
      const tx = await prepareApproveTx(srcToken, srcAmount);
      const { safeTxHash } = await sdk.txs.send({ txs: [ tx ] });

      console.log({ safeTxHash });
      checkTx(safeTxHash);
    }
    catch (e) {
      setLoading(false);
      console.error(e);
    }
  }, [sdk, srcToken, srcAmount]);

  useEffect(() => {
    const errors: string[] = [];

    if (srcToken.address !== '' && !isAddress(srcToken.address)) {
      errors.push('INVALID_INPUT_ADDRESS');
    }
    if (dstToken.address !== '' && !isAddress(dstToken.address)) {
      errors.push('INVALID_TARGET_ADDRESS');
    }

    if (isAddress(srcToken.address) && srcAmount !== '') {
      const srcAmountBN = toBN(Number(srcAmount) * Math.pow(10, srcToken.decimals));
      const balanceBN = toBN(srcToken.balance);
      const rewardBN = toBN(Number(reward) * Math.pow(10, 18));
      const valueBN = srcToken.name === 'Ethereum'
        ? srcAmountBN.add(rewardBN)
        : rewardBN;

      if (srcAmountBN.gte(balanceBN)) {
        errors.push( 'NOT_ENOUGH_FOR_INPUT');
      }

      if (reward !== '' && valueBN.gte(toBN(safeBlance))) {
        errors.push('NOT_ENOUGH_FOR_VALUE');
      }
    }

    if (srcToken.address !== '' &&
      dstToken.address !== '' &&
      srcAmount !== '' &&
      minDstAmount !== '' &&
      reward !== '' &&
      errors.length === 0
    ) {
      setDisabled(false);
    }
    setErrors(errors);
  }, [safeBlance, srcToken, dstToken, srcAmount, minDstAmount, reward]);

  useEffect(() => {
    if (srcToken.address !== '' &&
      isAddress(srcToken.address) &&
      srcToken.name !== 'Ethereum'
    ) {
      const srcAmountBN = toBN(Number(srcAmount) * Math.pow(10, srcToken.decimals));
      const allowanceBN = toBN(Number(srcToken.allowance))

      setNeedApproval(srcAmountBN.gt(allowanceBN));
    }
    else {
      setNeedApproval(false);
    }
  }, [srcToken, srcAmount]);

  useEffect(() => {
    if (safe.safeAddress)
      sdk.eth.getBalance([safe.safeAddress]).then(bal => setSafeBalance(bal));
  }, [sdk, safe]);

  return (
    <Container>
      <Title size="xs">1Inch Order Proxy</Title>
      <Text size="md">helps Multisig avoid high slippage and missed trading opportunities on 1Inch when there’re some difficulties in coordinating transaction’s confirmation</Text>
      <form noValidate autoComplete="off">
        <Text size="lg">What's the address of the token that you want to swap?</Text>
        <TextFieldContainer>
          <TextField
            endAdornment={srcToken?.logoURI !== ''
              ? <Avatar style={{ height: '25px', width: '25px' }} src={srcToken?.logoURI} alt="Source token"/>
              : <></>
            }
            id="src-address"
            label="Input token address *"
            value={srcToken?.address}
            meta={ errors.includes('INVALID_INPUT_ADDRESS') ? { error: 'Invalid address' } : {}}
            onChange={({ target }) => handleAddress(setSrcToken, target.value)}
          />
        </TextFieldContainer>

        <Text size="lg">How much do you want to swap?</Text>
        <TextFieldContainer>
          <TextField
            endAdornment={
              <p>{srcToken?.symbol}</p>
            }
            id="src-amount"
            label="Amount *"
            value={srcAmount}
            type="number"
            meta={ errors.includes('NOT_ENOUGH_FOR_INPUT') ? { error: 'You don\'t have enough ' + srcToken.symbol } : {}}
            onChange={({ target }) => setSrcAmount(target.value)}
          />
        </TextFieldContainer>

        <Text size="lg">What's the address of the token that you want to receive?</Text>
        <TextFieldContainer>
          <TextField
            endAdornment={dstToken?.logoURI !== ''
              ? <Avatar style={{ height: '25px', width: '25px' }} src={dstToken?.logoURI} alt="Target token"/>
              : <></>
            }
            id="dst-address"
            label="Target token address *"
            value={dstToken?.address}
            meta={ errors.includes('INVALID_TARGET_ADDRESS') ? { error: 'Invalid address' } : {}}
            onChange={({ target }) => handleAddress(setDstToken, target.value)}
          />
        </TextFieldContainer>

        <Text size="lg">What's the minimum amount you want to receive?</Text>
        <TextFieldContainer>
          <TextField
            endAdornment={
              <p>{dstToken?.symbol}</p>
            }
            id="min-dst-amount"
            label="Min. return amount *"
            value={minDstAmount}
            type="number"
            onChange={({ target }) => setMinDstAmount(target.value)}
          />
        </TextFieldContainer>

        <Text size="lg">How much do you want to reward the one who executes the transaction?</Text>
        <TextFieldContainer>
          <TextField
            id="reward"
            label="Reward in ETH *"
            value={reward}
            type="number"
            meta={ errors.includes('NOT_ENOUGH_FOR_VALUE') ? { error: 'You don\'t have enough ETH' } : {}}
            onChange={({ target }) => setReward(target.value)}
          />
        </TextFieldContainer>
      </form>
        {loading ? <div><Loader size="sm" /><Text size="md">Waiting to execute a transaction...</Text></div> : (
          needApproval ? (
            <Button size="lg" color="primary" variant="contained" onClick={onApproveLimit}>
              Approve spending limit
            </Button>
          ) : (
            <Button size="lg" color="primary" variant="contained" disabled={disabled} onClick={onSubmit}>
              Submit
            </Button>
          )
      )}
    </Container>
  );
};

export default CreateOrder;
