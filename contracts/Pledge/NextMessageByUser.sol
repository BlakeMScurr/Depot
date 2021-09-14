//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./IPledge.sol";
import "./Pledge.sol";
import "./ABIHack.sol";

// By adhering to this contract, a server agrees that it will always provide the next message by a given user when asked.
contract NextMessageByUser {
    uint256 constant leeway = 10;

    struct FindRequest {
        uint256 fromBlockNumber;
        bytes fromMessage;
        address byUser;
    }

    ABIHack abiHack;
    constructor(address _abiHack) {
        abiHack = ABIHack(_abiHack);
    }

    function isBroken(Pledge.SignedResponse[] memory receipts, address server) external view returns (bool) {
        // First the plaintiff gives evidence that a message exists, and shows that it was requested
        bytes memory findResponse;
        Pledge.Request memory evidence;
        FindRequest memory findRequest;
        (evidence, findRequest, findResponse) = requireValidEvidence(receipts, server);

        // Secondly the server gives an affadavit that it relayed some message when asked
        bool invalid;
        Pledge.Request memory affadavit;
        (affadavit, invalid) = invalidAffadavit(findRequest, findResponse);
        if (invalid) {
            return false;
        }

        // Finally we check that the message in the plaintiff's evidence is more recent than the message in the server's affadavit.
        // If so, the server censored the message in the evidence and broke their pledge.
        return messageIsEarlier(evidence, affadavit);
    }

    // Was the evidence message earlier than the affadavit message?
    function messageIsEarlier(Pledge.Request memory evidence, Pledge.Request memory affadavit) internal pure returns (bool) {
        if (affadavit.blockNumber < evidence.blockNumber) {
            // If the affadavit was from an earlier block, the pledge wasn't broken
            return false;
        } else if (affadavit.blockNumber > evidence.blockNumber) {
            // If the evidence was from an earlier block, the pledge was broken
            return true;
        }

        // The messages are from the same block, so the pledge is only broken if the evidence was earlier by some arbitrary tie break
        if (compare(affadavit.message, evidence.message) < 0) {
            return false;
        }

        return true;
    }

    // Did the server provide a valid response to the find request?
    //
    // This breaks down into 3 requirements:
    // - The response to the find request must be a well formatted store request
    // - The user who created the store request must be the one requested in the find request
    // - The store request must be properly signed by the user
    // - The store request must be from the requested time or after
    //
    // n.b., the affadavit is checked after the plaintiff's has proven that there exists some message that ought to have been
    // returned in the find response. So any error in the above requirements represents a broken pledge.
    function invalidAffadavit(FindRequest memory findRequest, bytes memory findResponse) internal view returns (Pledge.Request memory, bool) {
        // The response to the find request must be a well formatted store request
        // Call an external contract to catch abi decoding errors
        Pledge.Request memory affadavit;
        try abiHack.isPledge(findResponse) {} catch {
            return (affadavit, true);
        }
        affadavit = abi.decode(findResponse, (Pledge.Request));

        if (keccak256(abi.encodePacked(affadavit.meta)) != keccak256(abi.encodePacked("store"))) {
            return (affadavit, true);
        }

        // The user who created the store request must be the one requested in the find request
        if (findRequest.byUser != affadavit.user) {
            return (affadavit, true);
        }

        // The store request must be properly signed by the user
        if (!Pledge.validUserSignature(affadavit)) {
            return (affadavit, true);
        }

        // The store request must be from the requested time or after
        if (affadavit.blockNumber < findRequest.fromBlockNumber) {
            return (affadavit, true);
        }
        
        if (compare(affadavit.message, findRequest.fromMessage) < 0) {
            return (affadavit, true);
        }

        return (affadavit, false);
    }

    // Did the plaintiff prove that Alice stored a message, then Alice's messages were asked for?
    // 
    // The above breaks down into several claims:
    // - Did the server sign some store request?
    // - Did the server sign a find request for some user's messages?
    // - Was the find request after the store request?
    // - Is the evidence applicable to the find request, i.e.:
    //      - Is the evidence from the user asked about in the find request?
    //      - Is the evidence after or equal to the earliest message implied by the find request?
    function requireValidEvidence(Pledge.SignedResponse[] memory receipts, address server) internal pure returns (Pledge.Request memory, FindRequest memory, bytes memory) {
        // Did the server sign a store and a find request?
        Pledge.SignedResponse memory evidence = receipts[0];
        Pledge.SignedResponse memory findResponse = receipts[1];
        require(keccak256(abi.encodePacked(evidence.request.meta)) == keccak256(abi.encodePacked("store")), "First request must be a store request");
        require(keccak256(abi.encodePacked(findResponse.request.meta)) == keccak256(abi.encodePacked("find")), "Second request must be a find request");
        Pledge.requireValidServerSignature(evidence, server);
        Pledge.requireValidServerSignature(findResponse, server);

        // Was the find request after the store request?
        // It's OK if the decode fails, because that means the plaintiff has provided invalid evidence, which can't be used to demonstrate a broken pledge.
        // The server can still be forced to sign valid find requests (via the queue), so it can't use this decoding step to avoid being held accountable for a broken pledge.
        FindRequest memory findRequest = abi.decode(findResponse.request.message, (FindRequest));
        require(findRequest.fromBlockNumber + leeway < findResponse.request.blockNumber, "Find requests must refer to the past, since the server can't know what might be stored in the future");

        // Is the evidence from the user asked about in the find request?
        require(findRequest.byUser == evidence.request.user);

        // Is the evidence after or equal to the earliest message implied by the find request?
        require(evidence.request.blockNumber >= findRequest.fromBlockNumber, "The evidence provided cannot be from an earlier block than the findRequest implies");
        if (evidence.request.blockNumber == findRequest.fromBlockNumber) {
            require(compare(evidence.request.message, findRequest.fromMessage) < 1, "If the evidence is from the earliest possible block that the findRequest implies, it mustn't be earlier within that block than the find request");
        }

        return (evidence.request, findRequest, findResponse.response);
    }

    // Arbitrary within-block request ordering scheme.
    // The only requirement is that it gives consistent results and runs cheaply.
    // We return a negative if `a` is earlier, 0 if equal, and a positive if `a` is later.
    function compare(bytes memory a, bytes memory b) internal pure returns (uint256) {
        if (a.length != b.length) {
            return a.length - b.length; // shorter is earlier
        }

        // TODO(performance): some bitwise operation or casting sections to uint256 and using a simple comparison could probably speed this up. I should do profiling first. 
        uint256 i;
        for (i = a.length - 1; i >= 0; i--) {
            if (a[i] != b[i]) {
                return uint(uint8(a[i]) - uint8(b[i]));
            }
        }

        return 0;
    }
}