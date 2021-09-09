//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Locker {
    IERC20 erc20;
    uint256 unlockDuration;
    mapping (address=>uint256) balances;
    mapping (address=>bool) unlocking;
    mapping (address=>uint256) unlockStartTime;

    uint256 constant max_uint256 = 2**256 - 1;

    constructor(address _erc20, uint256 _unlockDuration) {
        erc20 = IERC20(_erc20);
        unlockDuration = _unlockDuration;
    }

    function amountLocked(address owner) public view returns (uint256) {
        if (unlocking[owner]) {
            return 0;
        }
        return balances[owner];
    }

    function lock(uint256 amount) public {
        erc20.transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] = balances[msg.sender] + amount;
        unlocking[msg.sender] = false;
        unlockStartTime[msg.sender] = max_uint256;
    }

    function unlock() public {
        unlocking[msg.sender] = true;
        unlockStartTime[msg.sender] = block.number;
    }

    function collect(uint256 amount) public {
        require(balances[msg.sender] >= amount, "You can only collect balances owed");
        require(block.number > unlockStartTime[msg.sender] + unlockDuration, "You must wait for your balances to unlock");
        erc20.transfer(msg.sender, amount);
    }
}
