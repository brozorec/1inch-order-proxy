# 1inch-order-proxy
With **1InchOrderProxy** one can register an order to swap between ERC20 tokens which is to be executed on [1Inch](https://1inch.exchange/) when certain predefined conditions are met. It's based on [version 2](https://github.com/1inch-exchange/1inch-v2-contracts) of 1Inch Protocol.

Its primary use case is for multisig accounts when all required members cannot confirm a given transaction at the same moment. This requires some coordination efforts and sometimes results in much higher slippage due to price changes or even in failed transactions, missed trading opportunities and unnecessary gas costs.

The idea behind this project is to avoid most of these inconveniences by intermediating the interactions between the multisig and 1Inch. Multisig sends to **1InchOrderProxy** the resources it wants to swap and defines a minimum required return amount, accompanied by a small amount of ETH that will cover gas costs of order’s execution. Once registered on 1InchOrderProxy, everyone can trigger the execution of the order on 1Inch and they get compensated by the provided additional ETH. At any moment before execution, multisig can ask for a refund of all sent resources.

- [Project's video presentation](https://youtu.be/XIbF8x4pGJU)

## How it works

### Order Creation

Parameters for `create()`:

`srcTokenAddr` - input ERC20 address

`dstTokenAddr` - target ERC20 address

`srcAmount` - amount of input ERC20 to be swapped (in minimal divisible units)

`minReturnAmount` - min expected amount of target ERC20 (in minimal divisible units)

`period` - period in seconds after which order cannot be executed

NOTES:
- If `srcTokenAddr` is ETH, `srcAmount` has to be included in `msg.value`.
- If `srcTokenAddr` isn't ETH, make sure that `msg.sender` has approved to spend `srcTokenAddr` in `srcAmount` amount.
- In both cases, multisig should provide additional ETH in `msg.value` that would serve as a compensation for the one who calls `execute()`.

IMPORTANT: If the input ERC20 isn’t ETH, multisig has to approve enough amount of that ERC20 as spending allowance for 1Inch address (0x111111125434b319222CdBf8C261674aDB56F3ae).

### Order Execution

Everyone can call `execute()` and if the specified conditions are met the order gets executed on 1Inch. The executor pays for the gas of this transaction and as a compensation they get the reward provided by the creator. If the swap is successful, the executor gets the reward and the creator the swapped amount in the same transaction. 

Parameters for `execute()`:

`orderId` - id of the order to be executed

`oneInchCallData` - data obtained from "/swap" endpoint of 1inch API

### Parts of the project

1. A smart contract (described above) that keeps the orders and interacts with 1Inch https://github.com/1inch-exchange/1inch-v2-contracts

2. An integration for [Gnosis safe](https://gnosis-safe.io) built with https://github.com/gnosis/safe-apps-sdk/ where multisig can create an order. In order to use it, go your Gnosis Safe -> Apps -> Add custom app and type `https://gnosis-1inch-order-proxy.herokuapp.com`.

3. A front-end client that lists all pending orders and allows to execute them by internalising calls to `https://api.1inch.exchange/v2.0/swap`. It's available [here](https://pool-1inch-order-proxy.herokuapp.com).


![Multisig Order Swap](https://github.com/brozorec/1inch-order-proxy/blob/develop/process-scheme.png)
