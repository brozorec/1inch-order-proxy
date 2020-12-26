import React, { useState, useEffect } from 'react';
import { useWallet } from 'use-wallet';
import { Icon, Card, List, Button, Label, Loader, Image, Segment } from 'semantic-ui-react';
import { getContract, prepareOrder } from './utils';

import OneInchOrderProxy from './contracts/OneInchOrderProxy.json';

const OrdersListComponent = ({ account }) => {
  const wallet = useWallet();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noOrders, setNoOrders] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      const contract = await getContract(OneInchOrderProxy);

      const count = await contract.methods.countOrders().call();
      const orders = [];
      for (let i = 0; i < count; i++) {
        const _order = await contract.methods.orders(i).call();
        if (_order.state === '0') {
          orders.push(await prepareOrder(_order, i, contract.options.address));
        }
      }
      if (orders.length === 0) {
        setNoOrders(true);
      }
      setLoading(false);
      setOrders(orders);
    };

    fetchOrders();
  }, []);

  const onExecute = async (order) => {
    if (!wallet.account) {
      wallet.connect();
    }
    else {
      const contract = await getContract(OneInchOrderProxy);
      const r = await contract.methods.execute(`${order.id}`, order.callData)
        .send({ from: wallet.account });
      console.log(r);
    }
  };

  const card = (order) => (
    <Card key={order.id}>
      <Card.Content textAlign='left'>
        <Label attached='top right' color='green'>
          Reward: {order.reward} ETH
        </Label>
        <Card.Content textAlign='center'>
          <span style={{ marginRight: '15px' }}>{order.fromToken.symbol}</span>
          <Image
            spaced='right'
            size='mini'
            src={order.fromToken.logoURI}
          />
          <Icon color='teal' name='long arrow alternate right'/>
          <Image
            spaced='left'
            size='mini'
            src={order.toToken.logoURI}
          />
          <span style={{ marginLeft: '15px' }}>{order.toToken.symbol}</span>
        </Card.Content>
        <Card.Content textAlign='center'>
          <div style={{ paddingTop: '5px' }}>
          </div>
        </Card.Content>
        <List relaxed>
          <List.Item>
            <div className='meta right floated'>source amount</div>
            <div className='left floated'>
              <b style={{ marginRight: '4px' }}>{order.fromToken.amount}</b>{order.fromToken.symbol}
            </div>
          </List.Item>
          <List.Item>
            <div className='meta right floated'>min. required</div>
            <div className='left floated'>
              <b style={{ marginRight: '4px' }}>{order.toToken.amount}</b>{order.toToken.symbol}
            </div>
          </List.Item>
          <List.Item>
            <div className='meta right floated'>beneficiary</div>
            <div className='left floated'>
              {order.beneficiary}
            </div>
          </List.Item>
          <List.Item>
            <div className='meta right floated'>expiration</div>
            <div className='left floated'>
              {order.exp}
            </div>
          </List.Item>
          <List.Item>
            <div className='meta right floated'>max. gas</div>
            <div className='left floated'>
              {order.gas}
            </div>
          </List.Item>
          <List.Item>
            <div className='meta right floated'>gas price</div>
            <div className='left floated'>
              {order.gasPrice + ' Gwei'}
            </div>
          </List.Item>
        </List>
      </Card.Content>
      <Card.Content extra>
        <Label pointing='right'>pay gas, get reward</Label>
        <Button basic color='green' onClick={() => onExecute(order)}>
          Execute
        </Button>
      </Card.Content>
    </Card>
  )

  return (
    <div style={{ paddingTop: '40px' }}>
      {loading
        ? <Loader active content='Loading' />
        : noOrders
        ? (
          <Segment textAlign='center'>No pending orders to execute</Segment>
        )
        : (
          <Card.Group itemsPerRow={3} stackable>
            {orders.map(order => card(order))}
          </Card.Group>
        )
      }
    </div>
  );
};

export default OrdersListComponent;
