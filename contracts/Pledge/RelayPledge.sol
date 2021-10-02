//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Pledge.sol";
import "./ABIHack.sol";

/**
 * @title Pledge to relay any stored messages.
 *
 *  @dev A server held to this pledge will relay any messages that it is asked to store.
 * The server holds all messages for each user in order. Anyone can request a message at any point in the ordering.
 * If the server responds with the wrong message, the pledge is broken, and the server can be penalized.
 */
contract RelayPledge {
    struct FindRequest {
        uint256 fromBlockNumber;
        bytes fromMessage;
        address byUser;
        bytes prefix;
    }

    ABIHack abiHack;
    address server;
    constructor(address _abiHack, address _server) {
        abiHack = ABIHack(_abiHack);
        server = _server;
    }

    /**
     * @dev Judges whether the server broke its pledge to relay messages.
     *
     * The plaintiff (msg.sender) provides receipts from the server as evidence.
     * The find receipt relays a message back to the finder, and confirms that the
     * relayed message is the latest message before a given point.
     * The store receipt confirms that the server stored a given message, which
     * the plaintiff alleges should have been relayed in the find receipt.
     *
     * If the plaintiff brough valid evidence, then either:
     * - the server relayed a valid message, which is later than the "withheld" message
     * - or the server broke its pledge. 
     */
    function isBroken(Pledge.Receipt memory storeReceipt, Pledge.Receipt memory findReceipt) external view returns (bool) {
        FindRequest memory findRequest;
        bytes memory findResponse;
        Pledge.Request memory withheld;
        (findRequest, findResponse, withheld) = validateReceipts(storeReceipt, findReceipt);

        bool valid;
        Pledge.Request memory relayed;
        (relayed, valid) = validRelay(findRequest, findResponse);
        if (!valid) {
            return true;
        }

        return messageIsEarlier(relayed, withheld);
    }

    /**
     * @dev Requires valid and applicable receipts.
     *
     * The receipts must be a properly formatted find and store receipt, and
     * the withheld message from the store receipt must be applicable to the
     * find receipt, i.e., it must be before or at the point defined by the
     * find receipt.
     */
    function validateReceipts(Pledge.Receipt memory storeReceipt, Pledge.Receipt memory findReceipt) internal view returns (FindRequest memory, bytes memory, Pledge.Request memory) {
        // Validate receipt types and signatures
        require(keccak256(abi.encodePacked(storeReceipt.request.meta)) == keccak256(abi.encodePacked("store")), "First request must be a store request");
        require(keccak256(abi.encodePacked(findReceipt.request.meta)) == keccak256(abi.encodePacked("find")), "Second request must be a find request");
        Pledge.requireValidServerSignature(storeReceipt, server);
        Pledge.requireValidServerSignature(findReceipt, server);

        // Validate find request format - the server can't be held to illformed requests
        FindRequest memory findRequest = abi.decode(findReceipt.request.message, (FindRequest));


        // Validate applicability of find request to store request
        require(findRequest.byUser == storeReceipt.request.user, "Find and store request relate to different users");
        require(hasPrefix(findRequest.prefix, storeReceipt.request.message), "Message lacks the needed prefix");
        require(findRequest.fromBlockNumber >= storeReceipt.request.blockNumber, "Message can't be a valid response to find request: stored after find request's start block");
        if (findRequest.fromBlockNumber == storeReceipt.request.blockNumber) {
            require(compare(findRequest.fromMessage, storeReceipt.request.message) >= 0, "Message can't be a valid response to find request: stored after find request's start point within the same block");
        }

        require(findRequest.fromBlockNumber < findReceipt.request.blockNumber, "Find requests must refer to the past, since the server can't know what might be stored in the future");

        return (findRequest, findReceipt.response, storeReceipt.request);
    }

    /**
     * @dev Returns whether the server responded to a find request with a valid message
     *
     * The reponse must be a properly signed and formatted message, and it must
     * be at/before the time specified by the request.
     */
    function validRelay(FindRequest memory findRequest, bytes memory findResponse) internal view returns (Pledge.Request memory, bool) {
        // The response to the find request must be a well formatted store request
        // Call an external contract to catch abi decoding errors
        Pledge.Request memory relayed;
        try abiHack.isPledge(findResponse) {} catch {
            return (relayed, false);
        }
        relayed = abi.decode(findResponse, (Pledge.Request));

        if (keccak256(abi.encodePacked(relayed.meta)) != keccak256(abi.encodePacked("store"))) {
            return (relayed, false);
        }

        // The store request must be properly signed by the user
        try Pledge.validUserSignature(relayed) returns (bool valid) {
            if (!valid) {
                return (relayed, false);
            }
        } catch {
            return (relayed, false);
        }

        // The user who created the store request must be the one requested in the find request
        if (findRequest.byUser != relayed.user) {
            return (relayed, false);
        }

        // The message must have the prefix specified in the request
        if (!hasPrefix(findRequest.prefix, relayed.message)) {
            return (relayed, false);
        }

        // The store request must be from the requested point or after
        if (relayed.blockNumber > findRequest.fromBlockNumber ||
            (relayed.blockNumber == findRequest.fromBlockNumber &&
            compare(relayed.message, findRequest.fromMessage) > 0)
        ) {
            return (relayed, false);
        }

        return (relayed, true);
    }

    /**
     * @dev Returns whether the first message is earlier than the second message.
     */
    function messageIsEarlier(Pledge.Request memory withheld, Pledge.Request memory relayed) internal pure returns (bool) {
        if (withheld.blockNumber != relayed.blockNumber) {
            return withheld.blockNumber < relayed.blockNumber;
        }

        // The messages are from the same block, so the pledge is broken iff the withheld message was earlier by some arbitrary tie break
        return compare(withheld.message, relayed.message) < 0;
    }

    /**
     * @dev Arbitrary within-block request ordering scheme
     *
     * The only requirement is that it gives consistent results and runs cheaply.
     * We return a negative if `a` is earlier, 0 if equal, and a positive if `a` is later.
     */
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

    /**
     * @dev Returns whether str has the given prefix.
     */
    function hasPrefix(bytes memory prefix, bytes memory str) internal pure returns (bool) {
        if (str.length < prefix.length) {
            return false;
        }

        for (uint256 i = 0; i < prefix.length; i++) {
            if (str[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}