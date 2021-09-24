//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Pledge/Pledge.sol";

contract Pool {
    event Receipt(bytes indexed meta, bytes indexed message, address indexed user, uint256 blockNumber, bytes signature);

    mapping(bytes32 => Pledge.Request) inbox;
    address serverEthAddress;
    uint256 leeway;

    constructor(address _serverEthAddress, uint256 _leeway) {
        serverEthAddress = _serverEthAddress;
        leeway = _leeway;
    }

    function request(Pledge.Request memory rq) public {
        require(Pledge.validUserSignature(rq), "Invalid signature");
        require(rq.blockNumber >= block.number, "Enforcement period cannot start in the past");
        inbox[keccak256(abi.encode(rq))] = rq;
    }

    function respond(bytes memory signature, bytes memory response, bytes32 requestHash) public {
        Pledge.Request memory rq = inbox[requestHash];
        Pledge.Receipt memory signed = Pledge.Receipt(rq, response, signature);
        Pledge.requireValidServerSignature(signed, serverEthAddress);
        emit Receipt(rq.meta, rq.message, rq.user, rq.blockNumber, signature);
        delete inbox[requestHash];
    }

    function late(bytes32 requestHash) public view returns (bool) {
        return inbox[requestHash].blockNumber + leeway < block.number;
    }
}