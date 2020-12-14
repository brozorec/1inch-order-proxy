// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.7.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "./UniswapV2Router02.sol";

contract OneInchMultisigProxy {
  using SafeMath for uint256;

  enum State { Pending, Fulfilled }
  struct Transaction {
    IERC20 fromToken;
    IERC20 destToken;
    uint256 amount;
    uint256 minReturnAmount;
    uint256 maxGasAmount;
    uint256 expiration;
    address payable beneficiary;
    State state;
  }

  IUniswapV2Router02 public uniswap;
  AggregatorV3Interface public priceProvider;

  Transaction[] public transactions;
  uint public _returnAmount;

  event Create(uint256 indexed id, address fromToken, address destToken, uint256 amount, uint256 expiration);

  constructor(
    address _uniswapRouterAddr,
    address _priceProviderAddr
  ) public {
    uniswap = IUniswapV2Router02(_uniswapRouterAddr);
    priceProvider = AggregatorV3Interface(_priceProviderAddr);
	}

  function create(
    address fromToken,
    address destToken,
    uint256 minReturnAmount,
    uint256 maxGasAmount,
    uint256 period
  ) external payable {
    uint256 expiration = block.timestamp + period;
    require(expiration > block.timestamp, "Transaction: Expiration is before current datetime");

    uint256 amount = msg.value;

    Transaction memory transaction = Transaction(
      IERC20(fromToken),
      IERC20(destToken),
      amount,
      minReturnAmount,
      maxGasAmount,
      expiration,
      msg.sender,
      State.Pending
    );
    uint256 transactionId = transactions.length;
    transactions.push(transaction);

    emit Create(transactionId, fromToken, destToken, amount, expiration);
  }

  function execute(uint256 transactionId) external {
    Transaction storage transaction = transactions[transactionId];

    require(transaction.state == State.Pending, "Transaction: Can execute only pending transactions");
    require(transaction.expiration >= block.timestamp, "Transaction: Cannot execute an expired transaction");

    address[] memory path = new address[](2);
    path[0] = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    path[1] = address(transaction.destToken);
    uint[] memory minOuts = uniswap.getAmountsOut(transaction.amount, path);
    _returnAmount = minOuts[1];

    uniswap.swapExactETHForTokens { value: transaction.amount }(
      minOuts[1],
      path,
      transaction.beneficiary,
      transaction.expiration
    );
  }

  function refund(uint256 transactionId) external {
    Transaction storage transaction = transactions[transactionId];

    require(transaction.state == State.Pending, "Transaction: Can refund only pending transactions");
  }

  //receive() external payable {}
}
