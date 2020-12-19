// SPDX-License-Identifier: MIT

pragma solidity >=0.4.25 <0.7.0;
pragma experimental ABIEncoderV2;

import "./UniERC20.sol";
import "./IOneInchExchange.sol";

contract OneInchOrderProxy {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;
  using UniERC20 for IERC20;

  enum State { Pending, Fulfilled, Refunded }
  struct Order {
    IERC20 srcToken;
    IERC20 dstToken;
    uint256 srcAmount;
    uint256 minReturnAmount;
    uint256 execReward;
    uint256 expiration;
    address payable beneficiary;
    State state;
  }

  IOneInchExchange public oneInchExchange;

  Order[] public orders;

  event Create(uint256 indexed id, address srcToken, address dstToken, uint256 srcAmount, uint256 execReward, uint256 minReturnAmount, uint256 expiration);
  event Update(uint256 indexed id, uint256 minReturnAmount, uint256 expiration);
  event Execute(uint256 indexed id);
  event Refund(uint256 indexed id);

  address public _dstReceiver;
  uint256 public _guaranteedAmount;
  uint256 public _minReturnAmount;

  constructor(
    address _oneInchAddr
  ) public {
    oneInchExchange = IOneInchExchange(_oneInchAddr);
	}

  /**
   * @dev - Create an order to be executed on OneInch before expiration.
   * If `srcTokenAddr` is ETH, `srcAmount` has to be included in msg.value.
   * If `srcTokenAddr` isn't ETH, make sure that msg.sender has approved 
   * to spend `srcTokenAddr` in `srcAmount` amount.
   * In both cases, one should provide additional ETH in msg.value that
   * would serve as a reward for the one who calls `execute(orderId,calldata)`.
   *
   * @param srcTokenAddr - input ERC20 address
   * @param dstTokenAddr - target ERC20 address
   * @param srcAmount - amount of input ERC20 to be swapped (in minimal divisible units)
   * @param minReturnAmount - min expected amount of target ERC20 (in minimal divisible units)
   * @param period - period in seconds after which order cannot be executed
   */
  function create(
    address srcTokenAddr,
    address dstTokenAddr,
    uint256 srcAmount,
    uint256 minReturnAmount,
    uint256 period
  ) external payable {
    uint256 expiration = block.timestamp + period;
    require(expiration > block.timestamp, "Order: Expiration is before current datetime");

    IERC20 srcToken = IERC20(srcTokenAddr);
    IERC20 dstToken = IERC20(dstTokenAddr);

    require(
      msg.value > (srcToken.isETH() ? srcAmount : 0),
      "Tx impossible: Not enough funds to pay reward"
    );
    uint256 execReward = srcToken.isETH() ? msg.value.sub(srcAmount) : msg.value;

    if (!srcToken.isETH()) {
      srcToken.safeTransferFrom(msg.sender, address(this), srcAmount);
      srcToken.uniApprove(address(oneInchExchange), srcAmount);
    }

    Order memory order = Order(
      srcToken,
      dstToken,
      srcAmount,
      minReturnAmount,
      execReward,
      expiration,
      msg.sender,
      State.Pending
    );
    uint256 orderId = orders.length;
    orders.push(order);

    emit Create(orderId, srcTokenAddr, dstTokenAddr, srcAmount, execReward, minReturnAmount, expiration);
  }

  /**
   * @dev - Update `minReturnAmount` and `expiration` of an existing order.
   *
   * @param minReturnAmount - min number of dstToken to be received
   * @param period - period in seconds after which order cannot be executed
   */
  function update(
    uint256 orderId,
    uint256 minReturnAmount,
    uint256 period
  ) external {
    uint256 expiration = block.timestamp + period;
    require(expiration > block.timestamp, "Order: Expiration is before current datetime");

    Order storage order = orders[orderId];

    require(order.state == State.Pending, "Order: Can update only pending orders");
    require(msg.sender == order.beneficiary, "Wrong msg.sender");
    
    order.minReturnAmount = minReturnAmount;
    order.expiration = expiration;

    emit Update(orderId, order.minReturnAmount, order.expiration);
  }

  /**
   * @dev - Execute order. On successful execution, msg.sender gets
   * `execReward` provided by order's `beneficiary`.
   *
   * @param orderId - id of order
   * @param oneInchCallData - data obtained from "/swap" endpoint of 1inch API
   */
  function execute(uint256 orderId, bytes calldata oneInchCallData) external {
    Order storage order = orders[orderId];

    require(
      order.state == State.Pending,
      "Order: Can execute only pending orders"
    );
    require(
      order.expiration >= block.timestamp,
      "Order: Cannot execute an expired order"
    );

    (IOneInchCaller caller, IOneInchExchange.SwapDescription memory desc, IOneInchCaller.CallDescription[] memory calls) = abi
      .decode(oneInchCallData[4:], (IOneInchCaller, IOneInchExchange.SwapDescription, IOneInchCaller.CallDescription[]));

    require(
      desc.guaranteedAmount >= order.minReturnAmount,
      "desc.guaranteedAmount is less than order.minReturnAmount"
    );

    require(
      address(desc.srcToken) == address(order.srcToken) &&
      address(desc.dstToken) == address(order.dstToken) &&
      desc.dstReceiver == order.beneficiary,
      "Calldata is not correct"
    );

    uint256 msgValue = order.srcToken.isETH() ? order.srcAmount : 0;

    uint256 returnAmount = oneInchExchange.swap{ value: msgValue }(caller, desc, calls);

    require(returnAmount >= order.minReturnAmount, "returnAmount is less than order.minReturnAmount");
    order.state = State.Fulfilled;

    msg.sender.transfer(order.execReward);
    emit Execute(orderId);
  }

  /**
   * @dev - Refund order's `beneficiary`.
   *
   * @param orderId - id of order
   */
  function refund(uint256 orderId) external {
    Order storage order = orders[orderId];

    require(order.state == State.Pending, "Order: Can refund only pending orders");
    require(msg.sender == order.beneficiary, "Wrong msg.sender");

    if (order.srcToken.isETH()) {
      order.srcToken.uniTransfer(msg.sender, order.srcAmount.add(order.execReward));
    }
    else {
      order.srcToken.uniTransfer(msg.sender, order.srcAmount);
      msg.sender.transfer(order.execReward);
    }

    order.state = State.Refunded;
    emit Refund(orderId);
  }

  /**
   * @dev - Return number of all created orders.
   */
  function countOrders() external view returns(uint256) {
    return orders.length;
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
