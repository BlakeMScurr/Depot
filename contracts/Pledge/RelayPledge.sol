//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./IPledge.sol";
import "./Pledge.sol";
import "./ABIHack.sol";

// A server held to this pledge will relay any messages that it is asked to store.
// The server holds all messages for each user in order. Anyone can request a message at any point in the ordering.
// If the server responds with the wrong message, the pledge is broken, and the server can be penalized.
contract RelayPledge {
    struct FindRequest {
        uint256 fromBlockNumber;
        bytes fromMessage;
        address byUser;
    }

    ABIHack abiHack;
    constructor(address _abiHack) {
        abiHack = ABIHack(_abiHack);
    }

    // Judges whether the server broke its pledge to relay messages.
    function isBroken(Pledge.Receipt[] memory receipts, address server) external view returns (bool) {
        // We check that the alledgedly withheld message was stored and requested
        FindRequest memory findRequest;
        bytes memory findResponse;
        Pledge.Request memory withheld;
        (findRequest, findResponse, withheld) = validateReceipts(receipts, server);

        // We check that the server relayed a genuine message when asked
        bool valid;
        Pledge.Request memory relayed;
        (relayed, valid) = validRelay(findRequest, findResponse);
        if (!valid) {
            return true;
        }

        // If the withheld message was earlier than the relayed message, then the server is broken its pledge
        return messageIsEarlier(withheld, relayed);
    }

    // Requires that we have a wellformed store and find receipt, and that the find receipt applies to the store receipt.
    function validateReceipts(Pledge.Receipt[] memory receipts, address server) internal pure returns (FindRequest memory, bytes memory, Pledge.Request memory) {
        // Validate receipt types and signatures
        Pledge.Receipt memory storeReceipt = receipts[0];
        Pledge.Receipt memory findReceipt = receipts[1];
        require(keccak256(abi.encodePacked(storeReceipt.request.meta)) == keccak256(abi.encodePacked("store")), "First request must be a store request");
        require(keccak256(abi.encodePacked(findReceipt.request.meta)) == keccak256(abi.encodePacked("find")), "Second request must be a find request");
        Pledge.requireValidServerSignature(storeReceipt, server);
        Pledge.requireValidServerSignature(findReceipt, server);

        // Validate find request format - the server can't be held to illformed requests
        FindRequest memory findRequest = abi.decode(findReceipt.request.message, (FindRequest));


        // Validate applicability of find request to store request
        require(findRequest.byUser == storeReceipt.request.user, "Find and store request relate to different users");
        require(findRequest.fromBlockNumber <= storeReceipt.request.blockNumber, "Message can't be a valid response to find request: stored before find request's start block");
        if (findRequest.fromBlockNumber == storeReceipt.request.blockNumber) {
            require(compare(findRequest.fromMessage, storeReceipt.request.message) < 1, "Message can't be a valid response to find request: stored before find request's start point within the same block");
        }

        require(findRequest.fromBlockNumber < findReceipt.request.blockNumber, "Find requests must refer to the past, since the server can't know what might be stored in the future");

        return (findRequest, findReceipt.response, storeReceipt.request);
    }

    // Did the server respond to the find request with a valid message?
    function validRelay(FindRequest memory findRequest, bytes memory findResponse) internal view returns (Pledge.Request memory, bool) {
        // The response to the find request must be a well formatted store request
        // Call an external contract to catch abi decoding errors
        Pledge.Request memory relayed;
        relayed = abi.decode(findResponse, (Pledge.Request));
        try abiHack.isPledge(findResponse) {} catch {
            return (relayed, false);
        }

        if (keccak256(abi.encodePacked(relayed.meta)) != keccak256(abi.encodePacked("store"))) {
            return (relayed, false);
        }

        // The store request must be properly signed by the user
        if (!Pledge.validUserSignature(relayed)) {
            return (relayed, false);
        }

        // The user who created the store request must be the one requested in the find request
        if (findRequest.byUser != relayed.user) {
            return (relayed, false);
        }

        // The store request must be from the requested point or after
        if (relayed.blockNumber < findRequest.fromBlockNumber ||
            (relayed.blockNumber < findRequest.fromBlockNumber &&
            compare(relayed.message, findRequest.fromMessage) < 0)
        ) {
            return (relayed, false);
        }

        return (relayed, true);
    }

    // Was the withheld message earlier than the relayed message?
    function messageIsEarlier(Pledge.Request memory withheld, Pledge.Request memory relayed) internal pure returns (bool) {
        if (withheld.blockNumber != relayed.blockNumber) {
            return withheld.blockNumber < relayed.blockNumber;
        }

        // The messages are from the same block, so the pledge is broken iff the withheld message was earlier by some arbitrary tie break
        return compare(withheld.message, relayed.message) < 0;
    }

    // Arbitrary within-block request ordering scheme.
    // The only requirement is that it gives consistent results and runs cheaply.
    // We return a negative if `a` is earlier, 0 if equal, and a positive if `a` is later.
    function compare(bytes memory a, bytes memory b) internal pure returns (int16) {
        if (a.length != b.length) {
            return a.length < b.length? -1 : int8(1);
        }

        // TODO(performance): some bitwise operation or casting sections to uint256 and using a simple comparison could probably speed this up. I should do profiling first. 
        uint256 i;
        for (i = 0; i < a.length; i++) {
            if (a[i] != b[i]) {
                return a[i] < b[i] ? -1: int8(1);
            }
        }

        return 0;
    }
}