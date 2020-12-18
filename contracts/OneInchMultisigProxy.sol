// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.7.0;
pragma experimental ABIEncoderV2;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "./UniERC20.sol";

interface IChi is IERC20 {
  function mint(uint256 value) external;
  function free(uint256 value) external returns (uint256 freed);
  function freeFromUpTo(address from, uint256 value) external returns (uint256 freed);
}

interface ISafeERC20Extension {
  function safeApprove(IERC20 token, address spender, uint256 amount) external;
  function safeTransfer(IERC20 token, address payable target, uint256 amount) external;
}

interface IGasDiscountExtension {
  function calculateGas(uint256 gasUsed, uint256 flags, uint256 calldataLength) external pure returns (IChi, uint256);
}

interface IOneInchCaller is ISafeERC20Extension, IGasDiscountExtension {
  struct CallDescription {
    uint256 targetWithMandatory;
    uint256 gasLimit;
    uint256 value;
    bytes data;
  }

  function makeCall(CallDescription memory desc) external;
  function makeCalls(CallDescription[] memory desc) external payable;
}

interface IOneInchExchange {
  struct SwapDescription {
    IERC20 srcToken;
    IERC20 dstToken;
    address srcReceiver;
    address dstReceiver;
    uint256 amount;
    uint256 minReturnAmount;
    uint256 guaranteedAmount;
    uint256 flags;
    address referrer;
    bytes permit;
  }

  function swap(
    IOneInchCaller caller,
    SwapDescription calldata desc,
    IOneInchCaller.CallDescription[] calldata calls
  ) external payable returns (uint256);
}

contract OneInchMultisigProxy {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;
  using UniERC20 for IERC20;

  enum State { Pending, Fulfilled, Refunded }
  struct Transaction {
    IERC20 srcToken;
    IERC20 dstToken;
    uint256 srcAmount;
    uint256 minReturnAmount;
    uint256 execReward;
    uint256 expiration;
    address payable beneficiary;
    State state;
  }

  AggregatorV3Interface public priceProvider;

  Transaction[] public transactions;

  event Create(uint256 indexed id, address srcToken, address dstToken, uint256 srcAmount, uint256 execReward, uint256 minReturnAmount, uint256 expiration);
  event Update(uint256 indexed id, uint256 minReturnAmount, uint256 expiration);
  event Execute(uint256 indexed id);
  event Refund(uint256 indexed id);

  address ONE_INCH_ADDRESS = 0x111111125434b319222CdBf8C261674aDB56F3ae;
  address public _dstReceiver;
  uint256 public _guaranteedAmount;
  uint256 public _minReturnAmount;

  constructor(
    address _priceProviderAddr
  ) public {
    priceProvider = AggregatorV3Interface(_priceProviderAddr);
	}

  /**
   * @param srcTokenAddr - address of token to swap from
   * @param dstTokenAddr - address of token to swap to
   * @param srcAmount - amount of srcToken passed with 1e18 decimals
   * @param minReturnAmount - TODO
   * @param period - period in seconds after which transaction cannot be executed
   */
  function create(
    address srcTokenAddr,
    address dstTokenAddr,
    uint256 srcAmount,
    uint256 minReturnAmount,
    uint256 period
  ) external payable {
    uint256 expiration = block.timestamp + period;
    require(expiration > block.timestamp, "Transaction: Expiration is before current datetime");

    IERC20 srcToken = IERC20(srcTokenAddr);
    IERC20 dstToken = IERC20(dstTokenAddr);

    require(
      msg.value > (srcToken.isETH() ? srcAmount : 0),
      "Tx impossible: Not enough funds to pay reward"
    );
    uint256 execReward = srcToken.isETH() ? msg.value.sub(srcAmount) : msg.value;

    if (!srcToken.isETH()) {
      srcToken.safeTransferFrom(msg.sender, address(this), srcAmount);
      srcToken.uniApprove(ONE_INCH_ADDRESS, srcAmount);
    }

    Transaction memory transaction = Transaction(
      srcToken,
      dstToken,
      srcAmount,
      minReturnAmount,
      execReward,
      expiration,
      msg.sender,
      State.Pending
    );
    uint256 transactionId = transactions.length;
    transactions.push(transaction);

    emit Create(transactionId, srcTokenAddr, dstTokenAddr, srcAmount, execReward, minReturnAmount, expiration);
  }

  function update(
    uint256 transactionId,
    uint256 minReturnAmount,
    uint256 period
  ) external {
    uint256 expiration = block.timestamp + period;
    require(expiration > block.timestamp, "Transaction: Expiration is before current datetime");

    Transaction storage transaction = transactions[transactionId];

    require(transaction.state == State.Pending, "Transaction: Can update only pending transactions");
    require(msg.sender == transaction.beneficiary, "Wrong msg.sender");
    
    transaction.minReturnAmount = minReturnAmount;
    transaction.expiration = expiration;

    emit Update(transactionId, transaction.minReturnAmount, transaction.expiration);
  }

  function execute(uint256 transactionId, bytes calldata oneInchCallData) external {
    Transaction storage transaction = transactions[transactionId];

    require(
      transaction.state == State.Pending,
      "Transaction: Can execute only pending transactions"
    );
    require(
      transaction.expiration >= block.timestamp,
      "Transaction: Cannot execute an expired transaction"
    );

    (IOneInchCaller caller, IOneInchExchange.SwapDescription memory desc, IOneInchCaller.CallDescription[] memory calls) = abi
      .decode(oneInchCallData[4:], (IOneInchCaller, IOneInchExchange.SwapDescription, IOneInchCaller.CallDescription[]));

    require(
      desc.guaranteedAmount >= transaction.minReturnAmount,
      "desc.guaranteedAmount is less than transaction.minReturnAmount"
    );

    require(
      address(desc.srcToken) == address(transaction.srcToken) &&
      address(desc.dstToken) == address(transaction.dstToken) &&
      desc.dstReceiver == transaction.beneficiary,
      "Calldata is not correct"
    );

    uint256 msgValue = transaction.srcToken.isETH() ? transaction.srcAmount : 0;

    uint256 returnAmount = IOneInchExchange(ONE_INCH_ADDRESS).swap{ value: msgValue }(caller, desc, calls);

    require(returnAmount >= transaction.minReturnAmount, "returnAmount is less than transaction.minReturnAmount");
    transaction.state = State.Fulfilled;

    msg.sender.transfer(transaction.execReward);
    emit Execute(transactionId);
  }

  function refund(uint256 transactionId) external {
    Transaction storage transaction = transactions[transactionId];

    require(transaction.state == State.Pending, "Transaction: Can refund only pending transactions");
    require(msg.sender == transaction.beneficiary, "Wrong msg.sender");

    if (transaction.srcToken.isETH()) {
      transaction.srcToken.uniTransfer(msg.sender, transaction.srcAmount.add(transaction.execReward));
    }
    else {
      transaction.srcToken.uniTransfer(msg.sender, transaction.srcAmount);
      msg.sender.transfer(transaction.execReward);
    }

    transaction.state = State.Refunded;
    emit Refund(transactionId);
  }

  function _decode_(bytes calldata oneInchCallData) external {
    (,IOneInchExchange.SwapDescription memory desc,) = abi
      .decode(oneInchCallData[4:], (IOneInchCaller, IOneInchExchange.SwapDescription, IOneInchCaller.CallDescription[]));

    _dstReceiver = desc.dstReceiver;
    _guaranteedAmount = desc.guaranteedAmount;
    _minReturnAmount = desc.minReturnAmount;
  }

  receive() external payable {}
}
