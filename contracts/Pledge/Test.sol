// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./RelayPledge.sol";
import "./Pledge.sol";

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

    function _validateReceipts(Pledge.Receipt memory storeReceipt, Pledge.Receipt memory findReceipt) public view returns (FindRequest memory, bytes memory, Pledge.Request memory) {
        return validateReceipts(storeReceipt, findReceipt);
    }
    function _validRelay(FindRequest memory findRequest, bytes memory findResponse) public view returns (Pledge.Request memory, bool) {
        return validRelay(findRequest, findResponse);
    }
    function _messageIsEarlier(Pledge.Request memory withheld, Pledge.Request memory relayed) public pure returns (bool) {
        return messageIsEarlier(withheld, relayed);
    }
    function _compare(bytes memory a, bytes memory b) public pure returns (int16) {
        return compare(a, b);
    }
}