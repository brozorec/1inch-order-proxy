// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.7.0;
pragma experimental ABIEncoderV2;

//import "@openzeppelin/contracts/token/ERC20/IERC20Detailed.sol";
//import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "./UniswapV2Router02.sol";
import "./IERC20Detailed.sol";
import "./UniERC20.sol";
import "./RevertReasonParser.sol";

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
  using SafeERC20 for IERC20Detailed;
  using UniERC20 for IERC20Detailed;

  enum State { Pending, Fulfilled }
  struct Transaction {
    IERC20Detailed srcToken;
    IERC20Detailed dstToken;
    uint256 srcAmount;
    uint256 minDstAmount;
    uint256 maxGasAmount;
    uint256 expiration;
    address payable beneficiary;
    State state;
  }

  IUniswapV2Router02 public uniswap;
  AggregatorV3Interface public priceProvider;

  Transaction[] public transactions;

  event Create(uint256 indexed id, address srcToken, address dstToken, uint256 srcAmount, uint256 expiration);

  address ONE_INCH_ADDRESS = 0x111111125434b319222CdBf8C261674aDB56F3ae;
  address public _dstReceiver;

  constructor(
    address _uniswapRouterAddr,
    address _priceProviderAddr
  ) public {
    uniswap = IUniswapV2Router02(_uniswapRouterAddr);
    priceProvider = AggregatorV3Interface(_priceProviderAddr);
	}

  /**
   * @param srcToken - address of token to swap from
   * @param dstToken - address of token to swap to
   * @param srcAmount - amount of srcToken passed with 1e18 decimals
   * @param minDstAmount - TODO
   * @param period - period in seconds after which transaction cannot be executed
   */
  function create(
    address srcToken,
    address dstToken,
    uint256 srcAmount,
    uint256 minDstAmount,
    uint256 period
  ) external payable {
    uint256 expiration = block.timestamp + period;
    require(expiration > block.timestamp, "Transaction: Expiration is before current datetime");

    IERC20Detailed _srcToken = IERC20Detailed(srcToken);
    IERC20Detailed _dstToken = IERC20Detailed(dstToken);

    require(
      msg.value > (_srcToken.isETH() ? srcAmount : 0),
      "Tx impossible: Not enough funds to pay for gas"
    );
    uint256 maxGasAmount = _srcToken.isETH() ? msg.value.sub(srcAmount) : msg.value;

    if (!_srcToken.isETH()) {
      _srcToken.safeTransferFrom(msg.sender, address(this), srcAmount);
      _srcToken.safeApprove(ONE_INCH_ADDRESS, srcAmount);
    }

    Transaction memory transaction = Transaction(
      _srcToken,
      _dstToken,
      srcAmount,
      minDstAmount,
      maxGasAmount,
      expiration,
      msg.sender,
      State.Pending
    );
    uint256 transactionId = transactions.length;
    transactions.push(transaction);

    emit Create(transactionId, srcToken, dstToken, srcAmount, expiration);
  }

  //function execute(uint256 transactionId, bytes calldata oneInchCallData) external {
    //Transaction storage transaction = transactions[transactionId];

    //require(
      //transaction.state == State.Pending,
      //"Transaction: Can execute only pending transactions"
    //);
    //require(
      //transaction.expiration >= block.timestamp,
      //"Transaction: Cannot execute an expired transaction"
    //);

    //uint256 msgValue = transaction.srcToken.isETH() ? transaction.srcAmount : 0;

    //(bool success, bytes memory result) = address(ONE_INCH_ADDRESS)
      //.call{ value: msgValue }(oneInchCallData);

    //if (!success) {
      //revert(RevertReasonParser.parse(result, "OneInchCaller callBytes failed: "));
    //}
  //}

  function execute(uint256 transactionId, bytes calldata oneInchCallData) external {
    Transaction storage transaction = transactions[transactionId];

    uint256 msgValue = transaction.srcToken.isETH() ? transaction.srcAmount : 0;

    (IOneInchCaller caller, IOneInchExchange.SwapDescription memory desc, IOneInchCaller.CallDescription[] memory calls) = abi
      .decode(oneInchCallData[4:], (IOneInchCaller, IOneInchExchange.SwapDescription, IOneInchCaller.CallDescription[]));

    _dstReceiver = desc.dstReceiver;

    IOneInchExchange(ONE_INCH_ADDRESS).swap{ value: msgValue }(caller, desc, calls);

    //if (!success) {
      //revert(RevertReasonParser.parse(result, "OneInchCaller callBytes failed: "));
    //}
  }

  function refund(uint256 transactionId) external {
    Transaction storage transaction = transactions[transactionId];

    require(transaction.state == State.Pending, "Transaction: Can refund only pending transactions");
  }

  receive() external payable {}
}
