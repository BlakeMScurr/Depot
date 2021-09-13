// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

library Pledge {
    using ECDSA for bytes32;

    struct Request {
        bytes meta;
        bytes message;
        address user;
        uint256 blockNumber;
        bytes signature;
    }

    struct SignedResponse {
        Request request;
        bytes response;
        bytes signature;
    }

    function requireValidServerSignature(SignedResponse memory resp, address signer) public pure {
        bytes32 hash = keccak256(abi.encode(resp.request, resp.response));
        require(hash.toEthSignedMessageHash().recover(resp.signature) == signer, "Signature must be valid");
    }

    function validUserSignature(Request memory rq) public pure returns (bool) {
        bytes32 hash = keccak256(abi.encode(rq.meta, rq.message, rq.user, rq.blockNumber));
        return hash.toEthSignedMessageHash().recover(rq.signature) == rq.user;
    }
}