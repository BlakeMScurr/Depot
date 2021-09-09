//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract Faithful is ERC20Capped {
    constructor() ERC20Capped(1000000) ERC20("Faithful", "FTH") {}
}