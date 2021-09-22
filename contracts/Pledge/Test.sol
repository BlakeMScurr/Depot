// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./RelayPledge.sol";

contract ExposedRelayPledge is RelayPledge {
    constructor(address _abiHack) RelayPledge(_abiHack) {}

    function _validateReceipts(Pledge.Receipt[] memory receipts, address server) public view returns (FindRequest memory, bytes memory, Pledge.Request memory) {
        return validateReceipts(receipts, server);
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