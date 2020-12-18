// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./IERC20Detailed.sol";

library UniERC20 {
  using SafeMath for uint256;
  using SafeERC20 for IERC20Detailed;
  using SafeERC20 for IERC20Detailed;

  //IERC20 private constant _ETH_ADDRESS = IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
  IERC20Detailed private constant _ETH_ADDRESS = IERC20Detailed(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
  IERC20Detailed private constant _ZERO_ADDRESS = IERC20Detailed(0);

  function isETH(IERC20Detailed token) internal pure returns (bool) {
    return (token == _ZERO_ADDRESS || token == _ETH_ADDRESS);
  }

  function uniBalanceOf(IERC20Detailed token, address account) internal view returns (uint256) {
    if (isETH(token)) {
      return account.balance;
    } else {
      return token.balanceOf(account);
    }
  }

  function uniTransfer(IERC20Detailed token, address payable to, uint256 amount) internal {
    if (amount > 0) {
      if (isETH(token)) {
        to.transfer(amount);
      } else {
        token.safeTransfer(to, amount);
      }
    }
  }

  function uniApprove(IERC20Detailed token, address to, uint256 amount) internal {
    require(!isETH(token), "Approve called on ETH");

    if (amount == 0) {
      token.safeApprove(to, 0);
    } else {
      uint256 allowance = token.allowance(address(this), to);
      if (allowance < amount) {
        if (allowance > 0) {
          token.safeApprove(to, 0);
        }
        token.safeApprove(to, amount);
      }
    }
  }

  function multiplier(IERC20Detailed token) internal view returns (uint256) {
    if (isETH(token)) {
      return 1e18;
    } else {
      return 10 ** uint256(token.decimals());
    }
  }
}
