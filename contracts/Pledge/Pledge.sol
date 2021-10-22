// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../BusinessLogic.sol";

/**
 * @title ECDSA Signature Verification
 * @dev Verifies signatures for requests and responses.
 */
library Pledge {
    using ECDSA for bytes32;

    /**
     * @dev Request made to the server.
     */
    struct Request {
        bytes meta;
        bytes message;
        address user;
        uint256 blockNumber;
        RequestLinter businessLogic;
        bytes signature;
    }

    /**
    * @dev Receipt returned from the server in response to a request.
    */
    struct Receipt {
        Request request;
        bytes response;
        bytes signature;
    }

    /**
    * @dev Verifies a server's receipt, reverts if invalid.
    * @param receipt Receipt to verify.
    */
    function requireValidServerSignature(Receipt memory receipt, address server) public pure {
        bytes32 hash = keccak256(abi.encode(receipt.request, receipt.response));
        require(hash.toEthSignedMessageHash().recover(receipt.signature) == server, "Server signature must be valid");
    }

    /**
     * @dev Verifies a user's signature,
     * @param rq Request to verify.
     * @return True if the signature is valid, false otherwise.
     */
    function validUserSignature(Request memory rq) public pure returns (bool) {
        bytes32 hash = keccak256(abi.encode(rq.meta, rq.message, rq.user, rq.blockNumber, rq.businessLogic));
        return hash.toEthSignedMessageHash().recover(rq.signature) == rq.user;
    }
}