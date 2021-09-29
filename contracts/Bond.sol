//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
* @title Server's locked up tokens
* @dev Bond locks up the server's token, slashes it if the server misbehaves, and gives the server a monthly income.
*/
contract Bond is Ownable {
    IERC20 erc20;
    uint256 lastDrawdown;

    mapping(bytes32 => bool) perjuries; // cases of broken pledges

    constructor(address _erc20) {
        erc20 = IERC20(_erc20);
        lastDrawdown = block.number;
    }

    /**
    * @dev Lock up token as a reward for the server.
    */
    function lock(uint256 amount) external {
        erc20.transferFrom(msg.sender, address(this), amount);
    }

    /**
    * @dev Every month the server can optionally draw up to a 200th of the locked funds (~%5.8 per year),
    */
    function draw(uint256 amount) external onlyOwner {
        require(amount < erc20.balanceOf(address(this)) / 200, "You can only draw funds less than our monthly drawdown");        
        require(lastDrawdown + 172800 < block.number, "You must wait a month to withdraw your monthly allowance"); // blocks/month = 4 * 60 * 24 * 30 = 172800
        lastDrawdown = block.number;
        erc20.transfer(this.owner(), amount);
    }

    /**
    * @dev A user can slash the bond if the server misbehaves.
    *
    * To be used by the parent contracts, depending on its pledges.
    *
    * The amount burned is 200 times the reward so that even if the server repeatedly called slash to recieve its bond early
    * via the reward, it would only end up with approximately its monthly income.
    *
    * @param burn amount The amount of tokens to be burned.
    */
    function slash(uint256 burn) internal {
        uint256 amountLocked = erc20.balanceOf(address(this));
        erc20.transfer(msg.sender, amountLocked / burn / 200);
        erc20.transfer(address(0), amountLocked / burn);
    }
}