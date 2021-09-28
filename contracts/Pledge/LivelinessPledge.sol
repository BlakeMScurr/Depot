//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Pledge.sol";

contract LivelinessPledge {
    event Receipt(bytes indexed meta, bytes indexed message, address indexed user, uint256 blockNumber, bytes signature);

    mapping(bytes32 => Pledge.Request) inbox;
    address serverSigningAccount;
    uint256 leeway;

    constructor(address _serverSigningAccount, uint256 _leeway) {
        serverSigningAccount = _serverSigningAccount;
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
        Pledge.requireValidServerSignature(signed, serverSigningAccount);
        emit Receipt(rq.meta, rq.message, rq.user, rq.blockNumber, signature);
        delete inbox[requestHash];
    }

    function isBroken(Pledge.Receipt[] memory receipts) public view returns (bool) {
        require(receipts.length < 2, "Extra requests enable replay attacks");
        return inbox[keccak256(abi.encode(receipts[0].request))].blockNumber + leeway < block.number;
    }
}