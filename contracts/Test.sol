// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./Pledge/RelayPledge.sol";
import "./Pledge/Pledge.sol";
import "./Bond.sol";

/**
 * @title Exposes Bond's slash method for testing purposes
 */
contract ExposedBond is Bond {
    constructor(address erc20) Bond(erc20){}

    function _slash(uint256 numerator, uint256 denominator) public {
        super.slash(numerator, denominator);
    }
}

/**
 * @title Exposes the pledge library for testing purposes
 */
contract ExposedPledgeLibrary {
    function validUserSignature(Pledge.Request memory rq) public pure returns (bool) {
        return Pledge.validUserSignature(rq);
    }

    function requireValidServerSignature(Pledge.Receipt memory receipt, address signer) public pure {
        Pledge.requireValidServerSignature(receipt, signer);
    }
}

/**
 * @title Exposed RelayPledge for testing purposes
 */
contract ExposedRelayPledge is RelayPledge {
    constructor(address _abiHack, address _server) RelayPledge(_abiHack, _server) {}

    function _validateReceipts(Pledge.Receipt memory storeReceipt, Pledge.Receipt memory findReceipt) public view returns (MessageFinder memory, bytes memory, Pledge.Request memory) {
        return validateReceipts(storeReceipt, findReceipt);
    }
    function _validRelay(MessageFinder memory messageFinder, bytes memory findResponse) public view returns (Pledge.Request memory, bool) {
        return validRelay(messageFinder, findResponse);
    }
    function _messageIsEarlier(Pledge.Request memory withheld, Pledge.Request memory relayed) public pure returns (bool) {
        return messageIsEarlier(withheld, relayed);
    }
    function _compare(bytes memory a, bytes memory b) public pure returns (int16) {
        return compare(a, b);
    }
}