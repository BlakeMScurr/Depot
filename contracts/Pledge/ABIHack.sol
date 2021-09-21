// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Pledge.sol";

// Solidity doesn't allow try/catch on abi.decode https://github.com/ethereum/solidity/issues/10381
// So in order to test whether some bytes are formatted as a valid Request we have this standalone contract that just does that.
// We can try/catch an external call to that contract.
contract ABIHack {
    function isPledge(bytes memory data) public view {
        abi.decode(data, (Pledge.Request));
    }
}