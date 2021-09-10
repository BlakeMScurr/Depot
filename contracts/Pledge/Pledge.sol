// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library Pledge {
    struct Request {
        string meta;
        string message;
        address poster;
        uint256 blockNumber;
    }

    struct SignedRequest {
        Request request;
        bytes signature;
    }
}