//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
* @title Server's locked up tokens
* @dev Bond locks up the server's token, slashes it if the server misbehaves, and gives the server a monthly income.
*/
contract Bond is Ownable {
    ERC20Burnable erc20;
    uint256 _lastWithdrawl;

    mapping(bytes32 => bool) perjuries; // cases of broken pledges

    constructor(address _erc20) {
        erc20 = ERC20Burnable(_erc20);
        _lastWithdrawl = block.number;
    }

    /**
    * @dev Every month the server can optionally withdraw up to a 200th of the locked funds (~%5.8 per year),
    */
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= erc20.balanceOf(address(this)) / 200, "At most you can withdraw the monthly allowance");
        require(_lastWithdrawl + 172800 < block.number, "You must wait a month to withdraw your monthly allowance"); // blocks/month = 4 * 60 * 24 * 30 = 172800
        _lastWithdrawl = block.number;
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
        erc20.burn(amountLocked / burn);
    }

    /**
    * @dev The last block where the server withdrew funds
    */
    function lastWithdrawl() public view returns (uint256) {
        return _lastWithdrawl;
    }
}