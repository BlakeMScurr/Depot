//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

/**
 * @title Silo is a simple capped ERC20 token.
 * @dev if the developer deploying the silo lacks funds for the bond, they can
 * make a token like silo, and limit interaction with the on chain pledges
 * based on token ownership, increasing the value of the bond.
 */
contract Silo is ERC20Capped {
    constructor() ERC20Capped(1000000000000) ERC20("Silo", "SILO") {}
}