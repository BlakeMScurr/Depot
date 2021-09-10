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
    }

    struct SignedRequest {
        Request request;
        bytes signature;
    }

    function requireValidSignature(SignedRequest memory rq, address signer) public pure {
        bytes32 hash = keccak256(abi.encode(rq.request.meta, rq.request.message, rq.request.user, rq.request.blockNumber));
        require(hash.toEthSignedMessageHash().recover(rq.signature) == signer, "Signature must be valid");
    }
}