//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Pledge/LivelinessPledge.sol";
import "./Pledge/IPledge.sol";

/**
* Bond locks up the server's token, slashes it if the server misbehaves, and gives the server a monthly income.
*/
contract Bond is Ownable {
    IERC20 erc20;
    uint256 lastDrawdown;

    committedPledge[] pledges; // pledges the server has committed
    mapping(bytes32 => bool) perjuries; // cases of broken pledges

    constructor(address _erc20) {
        erc20 = IERC20(_erc20);
        lastDrawdown = block.number;
    }

    /**
    * Anyone can lock up token in the bond as a reward for the server
    */
    function lock(uint256 amount) public {
        erc20.transferFrom(msg.sender, address(this), amount);
    }

    /**
    * Every month the server can optionally draw a 200th of the locked funds (~%5.8 per year)
    */
    function draw(uint256 amount) public onlyOwner {
        require(amount < erc20.balanceOf(address(this)) / 200, "You can only draw funds less than our monthly drawdown");        
        require(lastDrawdown + 172800 < block.number, "You must wait a month to withdraw your monthly allowance"); // blocks/month = 4 * 60 * 24 * 30 = 172800
        lastDrawdown = block.number;
        erc20.transfer(this.owner(), amount);
    }

    /**
    * The server can freely make pledges on the same bond, it doesn't affect the existing pledges
    */
    function addPledge(committedPledge memory p) public onlyOwner {
        pledges.push(p);
    }

    /**
    * If anyone finds that the server has broken a pledge, they can provide proof in the form of receipts, recieve a reward
    * and slash burn some of the bond in the process.
    * The amount burned is 200 times the reward so that even if the server repeatedly called slash to recieve its bond early
    * via the reward, it would only end up with approximately its monthly income.
    */
    function slash(Pledge.Receipt[] memory rqs, uint256 i) public {
        committedPledge memory p = pledges[i];
        bytes32 hash = keccak256(abi.encode(rqs, i));
        if (p.pledge.isBroken(rqs) && !perjuries[hash] && p.lastSlash + p.reprieve < block.number) {
            perjuries[hash] = true;
            p.lastSlash = block.number;
            uint256 amountLocked = erc20.balanceOf(address(this));
            erc20.transfer(msg.sender, amountLocked / (p.burned * 200));
            erc20.transfer(address(0), amountLocked / p.burned);
        }
    }

    struct committedPledge {
        IPledge pledge; // contract specifying the pledge logic
        uint256 burned; // fraction of the bond burned if the pledge is broken
        uint256 reprieve; // minimum blocks between slashes, to give the server operators time to respond before the bond is drained
        uint256 lastSlash; // block number of the last slashing event
    }
}
