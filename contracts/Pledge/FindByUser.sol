//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IPledge.sol";
import "./Pledge.sol";

contract FindByUser {
    uint256 constant leeway = 10;

    function isBroken(Pledge.SignedRequest[] memory requests, address server) external pure returns (bool) {
        Pledge.SignedRequest memory storeRequest = requests[0];
        Pledge.SignedRequest memory findRequest = requests[1];

        require(keccak256(abi.encodePacked(storeRequest.request.meta)) == keccak256(abi.encodePacked("store")), "First request must be a store request");
        require(keccak256(abi.encodePacked(findRequest.request.meta)) == keccak256(abi.encodePacked("find")), "Second request must be a find request");

        Pledge.requireValidSignature(storeRequest, server);
        Pledge.requireValidSignature(findRequest, server);

        // If the findRequest didn't relate to the user referenced in the storeRequest, the pledge was not broken
        if (keccak256(abi.encodePacked(findRequest.request.message)) == keccak256(abi.encodePacked(storeRequest.request.user))) {
            return false;
        }

        // If the server didn't necessarily know about the storeRequest at the time of findRequest, the pledge was not broken
        // TODO: how much leeway (if any) do we need? How could a user use the queue to trick the server into committing to a falsehood.
        // The server must be robust to a chain reorg, and a user maliciously placing a request in the queue
        if (storeRequest.request.blockNumber + leeway > findRequest.request.blockNumber) {
            return false;
        }

        // TODO:
        // If the store replied with a genuine earlier message from the user, the pledge was not broken

        return true;
    }

}