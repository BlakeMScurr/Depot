//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IPledge.sol";
import "./Pledge.sol";

contract FindByUser {
    uint256 constant leeway = 10;

    struct FindRequest {
        uint256 fromBlockNumber;
        address byUser;
    }

    /** 
    * To show that the server has responded incorrectly to a FindByUser request, the plaintiff must provide
    */
    function isBroken(Pledge.SignedResponse[] memory receipts, address server) external pure returns (bool) {
        // VALIDATE RECEIPTS (did the plaintiff provide the right kind of information in their case)
        // The plaintiff has to provide a store request and a find request both correctly signed by the server, otherwise they can't prove anything about the pledge
        Pledge.SignedResponse memory evidenceStoreResponse = receipts[0];
        Pledge.SignedResponse memory findResponse = receipts[1];

        require(keccak256(abi.encodePacked(evidenceStoreResponse.request.meta)) == keccak256(abi.encodePacked("store")), "First request must be a store request");
        require(keccak256(abi.encodePacked(findResponse.request.meta)) == keccak256(abi.encodePacked("find")), "Second request must be a find request");

        Pledge.requireValidServerSignature(evidenceStoreResponse, server);
        Pledge.requireValidServerSignature(findResponse, server);

        FindRequest memory findRequest = abi.decode(findResponse.request.message, (FindRequest));

        require(findRequest.fromBlockNumber + leeway < findResponse.request.blockNumber, "Find requests must refer to the past, since the server can't know what might be stored in the future");





        // VALIDATE FIND RESPONSE (did the server provide the relevant kind of information in their signed response)
        // In reponse to a find request, the server must provide a signed store request from the relevant user.
        // TODO: do I need to make this a server signed request, or is a client signature sufficient? Even if we made it a server signed request, the server could just sign it immediately.
        // TODO: respond true if this fails - the pledge requires that the server respond with some store request to any find request.
        Pledge.Request memory attestedStoreRequest = abi.decode(findResponse.response, (Pledge.Request));

        // The attested store request must indeed be a store request, or else the server broke pledge
        if (keccak256(abi.encodePacked(attestedStoreRequest.meta)) != keccak256(abi.encodePacked("store"))) {
            return true;
        }

        // The attested store request must either be null, or be from the user asked about in the find request, or else the server broke pledge
        if (keccak256(abi.encodePacked(findRequest.byUser)) != keccak256(abi.encodePacked(attestedStoreRequest.user)) && attestedStoreRequest.user != address(0)) {
            return true;
        }

        // TODO: is the following necessary? "If the attested store request address is 0, the rest of the request must also be null"

        // If the attested store request is not zero ...
        if (attestedStoreRequest.user != address(0)) {
            // ... the signature must be valid, otherwise the server has falsified data and broken the pledge.
            if (!Pledge.validUserSignature(attestedStoreRequest)) {
                return true;
            }

            // If the attested store request is from before the time specified in the find request, the server has attested to a falsehood.
            if (attestedStoreRequest.blockNumber < findRequest.fromBlockNumber) {
                return true;
            }
        }




        // VALIDATE EVIDENCE APPLICABILITY (does the evidence provided by the plaintiff demonstrate that the attestation by the server was false?)

        // If the the user referenced in the evidenceStoreResponse is not the same as the one in the find request, the pledge was not broken
        if (keccak256(abi.encodePacked(evidenceStoreResponse.request.user)) == keccak256(abi.encodePacked(findRequest.byUser))) {
            return false;
        }

        // If the server didn't necessarily know about the evidenceStoreResponse at the time of findResponse, the pledge was not broken
        // TODO: do we need leeway? How could a user use the queue to trick the server into committing to a falsehood.
        // The server must be robust to a chain reorg, and a user maliciously placing a request in the queue
        if (evidenceStoreResponse.request.blockNumber > findResponse.request.blockNumber) {
            return false;
        }

        // We have already established that the server signed a store response by the user at issue before find request.
        // If the server attested that there was no such store request, they broke their pledge. 
        if (attestedStoreRequest.user == address(0)) {
            return true;
        }

        // If the store replied with a genuine equal or earlier message from the user, the pledge was not broken
        // Earlier first refers to blocknumber, then ties are broken on alphabetical order (TODO: is this safe or sensible??)

        // If the evidence and attested store requests are identical the server did not break their pledge
        if (keccak256(abi.encode(evidenceStoreResponse.request)) == keccak256(abi.encode(attestedStoreRequest))) {
            return false;
        }

        // We know that
        // - The server attested to a store request that was different the one provided as evidence
        // - The evidence was before or at the same time as the attestated
        // The only remaining defence is that there were multiple store requests in the same block,
        // and that the server returned an "earlier" response (by some arbitrary tie break).
        if (earlierOrEqual(attestedStoreRequest.message, evidenceStoreResponse.request.message)) {
            return false;
        }

        return true;
    }

    // Arbitrary bitwise within-block request ordering scheme.
    // The only requirement is that it gives consistent results and runs cheaply.
    function earlierOrEqual(bytes memory a, bytes memory b) internal pure returns (bool) {
        if (a.length != b.length) {
            return a.length < b.length;
        }

        uint256 i;
        for (i = a.length - 1; i >= 0; i--) {
            if (a[i] != b[i]) {
                return a[i] < b[i];
            }
        }

        return true;
    }
}