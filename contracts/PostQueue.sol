//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// PostQueue handles the 
contract PostQueue {
    using ECDSA for bytes32;

    struct Request {
        string message;
        address poster;
        uint256 blockNumber;
    }

    event Receipt(string message, address indexed poster, uint256 blockNumber, bytes signature);

    Request[] requests;
    uint256 index;
    address serverEthAddress;
    uint256 leeway;

    constructor(address _serverEthAddress, uint256 _leeway) {
        serverEthAddress = _serverEthAddress;
        leeway = _leeway;
        index = 0;

    }

    function enqueue(string memory message) public {
        requests.push(Request(message, msg.sender, block.number));
    }

    function dequeue(bytes memory signature) public {
        bytes32 hash = keccak256(abi.encode(requests[index].message, requests[index].poster, requests[index].blockNumber));
        require(hash.toEthSignedMessageHash().recover(signature) == serverEthAddress, "Request receipts must be signed by the server");
        emit Receipt(requests[index].message, requests[index].poster, requests[index].blockNumber, signature);
        index++;
    }

    function late() public view returns (bool) {
        return requests[index].blockNumber + leeway < block.number;
    }

}
