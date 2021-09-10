//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Pledge/Pledge.sol";

contract Queue {
    event Receipt(bytes indexed meta, bytes indexed message, address indexed user, uint256 blockNumber, bytes signature);

    Pledge.Request[] requests;
    uint256 index;
    address serverEthAddress;
    uint256 leeway;

    constructor(address _serverEthAddress, uint256 _leeway) {
        serverEthAddress = _serverEthAddress;
        leeway = _leeway;
        index = 0;
    }

    function enqueue(bytes memory meta, bytes memory message) public {
        requests.push(Pledge.Request(meta, message, msg.sender, block.number));
    }

    function dequeue(bytes memory signature) public {
        Pledge.Request memory rq = requests[index];
        Pledge.SignedRequest memory signed = Pledge.SignedRequest(rq, signature);
        Pledge.requireValidSignature(signed, serverEthAddress);
        emit Receipt(rq.meta, rq.message, rq.user, rq.blockNumber, signature);
        index++;
    }

    function late() public view returns (bool) {
        return requests[index].blockNumber + leeway < block.number;
    }
}