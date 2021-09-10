//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./Pledge/Pledge.sol";

contract Queue {
    using ECDSA for bytes32;

    event Receipt(string indexed meta, string indexed message, address indexed poster, uint256 blockNumber, bytes signature);

    Pledge.Request[] requests;
    uint256 index;
    address serverEthAddress;
    uint256 leeway;

    constructor(address _serverEthAddress, uint256 _leeway) {
        serverEthAddress = _serverEthAddress;
        leeway = _leeway;
        index = 0;
    }

    function enqueue(string memory meta, string memory message) public {
        requests.push(Pledge.Request(meta, message, msg.sender, block.number));
    }

    function dequeue(bytes memory signature) public {
        Pledge.Request memory rq = requests[index];
        bytes32 hash = keccak256(abi.encode(rq.meta, rq.message, rq.poster, rq.blockNumber));
        require(hash.toEthSignedMessageHash().recover(signature) == serverEthAddress, "Request receipts must be signed by the server");
        emit Receipt(rq.meta, rq.message, rq.poster, rq.blockNumber, signature);
        index++;
    }

    function late() public view returns (bool) {
        return requests[index].blockNumber + leeway < block.number;
    }
}