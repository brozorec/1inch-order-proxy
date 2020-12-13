// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.7.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@chainlink/contracts/src/v0.5/interfaces/AggregatorV3Interface.sol";
import "./IOneSplit.sol";

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
    address payable owner;
    State state;
  }

  IOneSplit public oneSplit;
  AggregatorV3Interface public priceProvider;

  Transaction[] public transactions;
  uint256 public _returnAmount;
  uint256 public _gas;

  event Create(uint256 indexed id, address fromToken, address destToken, uint256 amount, uint256 expiration);

  constructor(
    address _oneSplitAddress,
    address _priceProviderAddress
  ) public {
    oneSplit = IOneSplit(_oneSplitAddress);
    priceProvider = AggregatorV3Interface(_priceProviderAddress);
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

    (uint256 expectedReturn, uint256[] memory distribution) = oneSplit.getExpectedReturn(
      transaction.fromToken,
      transaction.destToken,
      transaction.amount,
      10,
      0
    );

    (,int256 answer,,,) = priceProvider.latestRoundData();
    uint256 latestGasPrice = uint256(answer);
    //(uint256 returnAmount, uint256 estimateGasAmount, uint256[] memory distribution) = oneSplit
      //.getExpectedReturnWithGas(
        //transaction.fromToken,
        //transaction.destToken,
        //transaction.amount,
        //10,
        //0,
        //expectedReturn.mul(latestGasPrice)
      //);
    uint256 returnAmount = oneSplit.swap.value(transaction.amount)(
      transaction.fromToken,
      transaction.destToken,
      transaction.amount,
      0,
      distribution,
      0
    );
    _returnAmount = returnAmount;
  }

  //_execute();

  function refund(uint256 transactionId) external {
    Transaction storage transaction = transactions[transactionId];

    require(transaction.state == State.Pending, "Transaction: Can refund only pending transactions");
  }

  //receive() external payable {}
}
