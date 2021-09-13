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

    function isBroken(Pledge.SignedResponse[] memory receipts, address server) external pure returns (bool) {
        // First we check that the plaintiff has provided valid evidence
        bytes memory findResponse;
        Pledge.SignedResponse memory evidence;
        FindRequest memory findRequest;
        (evidence, findRequest, findResponse) = validEvidence(receipts, server);

        // Secondly we check that the server's affadavit is internally consistent
        bool valid;
        Pledge.Request memory affadavit;
        (affadavit, valid) = validFindResponse(findRequest, findResponse);
        if (!valid) {
            return true;
        }

        // Finally we check whether the plaintiff's evidence proves that the server's affadavit is a lie
        return weighEvidence(evidence, affadavit, findRequest);
    }

    // Does the evidence provided by the plaintiff demonstrate that the server's affadavit was false?
    function weighEvidence(Pledge.SignedResponse memory evidence, Pledge.Request memory affadavit, FindRequest memory findRequest) internal pure returns (bool) {
        // If the the user referenced in the evidence is not the same as the one in the find request, the pledge was not broken
        if (keccak256(abi.encodePacked(evidence.request.user)) == keccak256(abi.encodePacked(findRequest.byUser))) {
            return false;
        }

        // We have already established that the server signed a store response by the user at issue before find request.
        // If the server attested that there was no such store request, they broke their pledge. 
        if (affadavit.user == address(0)) {
            return true;
        }

        // If the store replied with a genuine equal or earlier message from the user, the pledge was not broken
        // Earlier first refers to blocknumber, then ties are broken on alphabetical order (TODO: is this safe or sensible??)

        // If the evidence and attested store requests are identical the server did not break their pledge
        if (keccak256(abi.encode(evidence.request)) == keccak256(abi.encode(affadavit))) {
            return false;
        }

        // We know that
        // - The server attested to a store request that was different the one provided as evidence
        // - The evidence was before or at the same time as the attestated
        // The only remaining defence is that there were multiple store requests in the same block,
        // and that the server returned an "earlier" response (by some arbitrary tie break).
        if (earlierOrEqual(affadavit.message, evidence.request.message)) {
            return false;
        }

        return true;
    }

    // Did the server provide a valid response to the find request?
    // In reponse to a find request, the server must provide a signed store request from the relevant user.
    function validFindResponse(FindRequest memory findRequest, bytes memory findResponse) internal pure returns (Pledge.Request memory, bool) {
        // The data in the find response must simply an earlier store request.
        // TODO: return false is abi.decode reverts
        // We can't use try/catch or tryRevert in solidity at the moment https://github.com/ethereum/solidity/issues/10381
        // Instead we can put abi.decode in an external contract call and catch that contract's reversion. Possibly relevant blog post (from before there was try/catch) https://blog.polymath.network/try-catch-in-solidity-handling-the-revert-exception-f53718f76047
        Pledge.Request memory affadavit = abi.decode(findResponse, (Pledge.Request));

        // The attested store request must indeed be a store request, or else the server broke pledge
        if (keccak256(abi.encodePacked(affadavit.meta)) != keccak256(abi.encodePacked("store"))) {
            return (affadavit, false);
        }

        // The attested store request must either be null, or be from the user asked about in the find request, or else the server broke pledge
        if (keccak256(abi.encodePacked(findRequest.byUser)) != keccak256(abi.encodePacked(affadavit.user)) && affadavit.user != address(0)) {
            return (affadavit, false);
        }

        // If the attested store request is not zero ...
        if (affadavit.user != address(0)) {
            // ... the signature must be valid, otherwise the server has falsified data and broken the pledge.
            if (!Pledge.validUserSignature(affadavit)) {
                return (affadavit, false);
            }

            // If the attested store request is from before the time specified in the find request, the server has attested to a falsehood.
            if (affadavit.blockNumber < findRequest.fromBlockNumber) {
                return (affadavit, false);
            }
        }

        return (affadavit, true);
    }

    // Did the plaintiff provide valid evidence for their case/
    // The plaintiff has to provide a store request and a find request both correctly signed by the server, otherwise they can't prove anything about the pledge.
    // Further, the findRequest must not ask about the future.
    function validEvidence(Pledge.SignedResponse[] memory receipts, address server) internal pure returns (Pledge.SignedResponse memory, FindRequest memory, bytes memory) {
        Pledge.SignedResponse memory evidence = receipts[0];
        Pledge.SignedResponse memory findResponse = receipts[1];

        require(keccak256(abi.encodePacked(evidence.request.meta)) == keccak256(abi.encodePacked("store")), "First request must be a store request");
        require(keccak256(abi.encodePacked(findResponse.request.meta)) == keccak256(abi.encodePacked("find")), "Second request must be a find request");

        Pledge.requireValidServerSignature(evidence, server);
        Pledge.requireValidServerSignature(findResponse, server);

        FindRequest memory findRequest = abi.decode(findResponse.request.message, (FindRequest));

        require(findRequest.fromBlockNumber + leeway < findResponse.request.blockNumber, "Find requests must refer to the past, since the server can't know what might be stored in the future");
        return (evidence, findRequest, findResponse.response);
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