//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PostQueue.sol";

// TODO: look into various vault standards etc
// TODO: is vault the right word? Perhaps guarantee?
contract LivelinessVault {
    PostQueue queue;
    address serverEthAddress;
    IERC20 erc20;

    constructor(address _queue, address _serverEthAddress, address _erc20) {
        queue = PostQueue(_queue);
        serverEthAddress = _serverEthAddress;
        erc20 = IERC20(_erc20);
    }

    function lock() public {
        // transferFrom token from the server to this contract
    }

    function unlock() public {
        // if the sender is the server, and it has been a month, transfer the appropriate percentage to the server's address
    }

    function slash() public {
        // if the queue is late, slash y% of the vault and distribute ~y/10 to the sender
        // TODO: consider the appropriate percentages, since the server can always self slash to get liquidity instantly
    }
}
