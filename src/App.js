import React, { useEffect } from 'react';
import { Container, Segment, Button, Icon } from 'semantic-ui-react';
import { useWallet, UseWalletProvider } from 'use-wallet';

import 'semantic-ui-css/semantic.min.css';
import "./App.css";
import { formatAccount } from './utils';

import OrdersListComponent from "./OrdersListComponent";

const CHAIN_ID = 1;

const App = () => {
  const wallet = useWallet();

  useEffect(() => {
    if (wallet.status === 'disconnected') {
      wallet.connect()
    }
  }, [wallet]);

  const header = () => (
    <Segment textAlign='right' vertical>
      <div style={{ marginRight: '15px' }}>{
        wallet.status === 'connected'
        ? <Button disabled basic color='green'>
          <Icon name='circle' size='small'/>
          {formatAccount(wallet.account)}
          </Button>
        : <Button basic onClick={() => wallet.connect()}>
            Connect MetaMask
          </Button>
      }</div>
    </Segment>
  )

  return (
    <>
      {header()}
      <Container style={{ paddingTop: '20px' }}>
        <h3>Pending orders from 1InchOrderProxy</h3>
        <p>Execute orders on 1Inch and get compensated for gas costs.Check
          <a href='https://github.com/brozorec/1inch-order-proxy' target='_blank' rel="noopener noreferrer">here</a>
          for more info.</p>
      </Container>
      <Container>
        <OrdersListComponent account={wallet.account}/>
      </Container>
    </>
  );
}

export default () => (
  <UseWalletProvider chainId={CHAIN_ID}>
    <App/>
  </UseWalletProvider>
)
