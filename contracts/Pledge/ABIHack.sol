// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Pledge.sol";

/**
 * @title Simple hacky way to enable tryDecode
 * @dev Solidity doesn't allow try/catch on abi.decode https: github.com/ethereum/solidity/issues/10381
 * So in order to test whether some bytes are formatted as a valid Request, this standalone contract attempts to decode some
 * bytes as a Request, and we are able to try/catch an external call to this contract.
 */
contract ABIHack {
    function isPledge(bytes memory data) public pure {
        abi.decode(data, (Pledge.Request));
    }
}