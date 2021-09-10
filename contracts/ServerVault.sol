//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Queue.sol";

// TODO: look into various vault standards etc
// TODO: is vault the right word? Perhaps guarantee?
contract LivelinessVault {
    Queue queue;
    address serverEthAddress;
    IERC20 erc20;
    uint256 lastDrawdown;
    uint256 constant monthlyDrawdown = 200; // Every month the server can draw down a 200th of the locked funds, for an APY of ~%6.1
    uint256 constant month = 4 * 60 * 24 * 30; // A month in terms of a 15 second block time
    uint256 constant amountSlashed = 10; // If the server is late in handling the request queue, a 10th of its funds are burned
    // TODO: consider whether this is the appropriate reward, as the server can always slash itself to get instant liquidity. How much liquidity could it get by each strategy? Is it necessary to award the fisher?
    uint256 constant reward = 100; // The user who realised the server is late gets a 100th of the locked funds

    constructor(address _queue, address _serverEthAddress, address _erc20) {
        queue = Queue(_queue);
        serverEthAddress = _serverEthAddress;
        erc20 = IERC20(_erc20);
        lastDrawdown = block.number;
    }

    function lock(uint256 amount) public {
        erc20.transferFrom(msg.sender, address(this), amount);
    }

    function draw(uint256 amount) public {
        require(msg.sender == serverEthAddress, "Only the server can unlock funds");
        require(amount < erc20.balanceOf(address(this)) / monthlyDrawdown, "You can only draw funds less than our monthly drawdown");        
        require(lastDrawdown + month < block.number, "You must wait a month to withdraw your monthly allowance");
        lastDrawdown = block.number;
        erc20.transfer(serverEthAddress, amount);
    }

    function slash() public {
        if (queue.late()) {
            uint256 amountLocked = erc20.balanceOf(address(this));
            erc20.transfer(msg.sender, amountLocked / reward);
            erc20.transfer(msg.sender, amountLocked / amountSlashed);
        }
    }
}
