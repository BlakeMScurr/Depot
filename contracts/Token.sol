//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract Silo is ERC20Capped {
    constructor() ERC20Capped(1000000000000) ERC20("Silo", "SILO") {}
}