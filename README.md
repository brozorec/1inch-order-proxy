# 1inch-order-proxy
"OneInchOrderProxy" allows registering and executing orders with predefined parameters on [1Inch](https://1inch.exchange/). It's based on [version 2](https://github.com/1inch-exchange/1inch-v2-contracts) of 1Inch Protocol.

Its primary use case is for multisig accounts when all required members cannot confirm a given transaction at the same moment. That causes sometimes much higher slippage due to price changes or even failed transactions, missed trading opportunities and unnecessary gas spendings.

The idea of this project is to avoid some of these inconveniences by intermediating the interactions between the multisig and 1Inch. Multisig sends to the smart contract the resources it wants to swap + a small amount of ETH that will at least cover gas spendings of order’s execution. At any moment before execution, multisig can ask for a refund of all sent resources.

## How it works

### Order Creation

IMPORTANT: If the input ERC20 isn’t ETH, multisig has to approve enough amount of that ERC20 as spending allowance for 1Inch address (0x111111125434b319222CdBf8C261674aDB56F3ae).

Parameters for `create()`:

`srcTokenAddr` - input ERC20 address

`dstTokenAddr` - target ERC20 address

`srcAmount` - amount of input ERC20 to be swapped (in minimal divisible units)

`minReturnAmount` - min expected amount of target ERC20 (in minimal divisible units)

`period` - period in seconds after which order cannot be executed

NOTES: If `srcTokenAddr` is ETH, `srcAmount` has to be included in `msg.value`. If `srcTokenAddr` isn't ETH, make sure that `msg.sender` has approved to spend `srcTokenAddr` in `srcAmount` amount. In both cases, one should provide additional ETH in `msg.value` that would serve as a reward for the one who calls `execute()`.

### Order Execution

Everyone can call `execute()` and if the specified conditions are met the order gets executed on 1Inch. The executor pays for the gas of that transaction but as a compensation he/she receives a reward set by the creator. If the swap is successful, the executor gets the reward and the creator the swapped amount in the same transaction. 

Parameters for `execute()`:

`orderId` - id of the order to be executed

`oneInchCallData` - data obtained from "/swap" endpoint of 1inch API

Creation of minimal frontend is in progress where one can find a list with all active orders that can be executed. That will internalise calls to 1inch API and `execute()`.
