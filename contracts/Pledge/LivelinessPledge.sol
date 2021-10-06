//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Pledge.sol";

/**
 * @title Pledge to stay lively.
 *
 * @dev Servers who make this plege are forced to respond to requests.
 * 
 * Anyone can put a request in the onchain `inbox` below, and if the server
 * doesn't respond in time, the pledge is broken and the server incurrs a
 * penalty.
 *
 * The server must pay gas to respond on chain, so if a user presents a valid
 * request off chain, it can be considered a threat to force the server to pay
 * gas. Therefore the server is incentivised to respond off chain.
 */
contract LivelinessPledge {
    event Receipt(bytes indexed meta, bytes indexed message, address indexed user, uint256 blockNumber, bytes signature);

    struct RequestRecord {
        Pledge.Request request;
        bool waiting;
    }

    mapping(bytes32 => RequestRecord) inbox;
    address serverSigner;
    uint256 leeway;

    constructor(address _serverSigner, uint256 _leeway) {
        serverSigner = _serverSigner;
        leeway = _leeway;
    }

    /**
    * @dev Put a request in the inbox.
    * 
    * Once the signs a receipt for a request, it becomes part of a permanent
    * record, and can be used to enforce other pledges. In particular, the
    * RelayPledge requires that users can't alter the past. Therefore we
    * require that the request be dated to the future. 
    *
    * @param rq The request.
    */
    function request(Pledge.Request memory rq) public {
        require(Pledge.validUserSignature(rq), "Invalid signature");
        require(rq.blockNumber >= block.number, "Enforcement period must start in the future");
        inbox[keccak256(abi.encode(rq))] = RequestRecord(rq, true);
    }

    /**
    * @dev Remove a request from the inbox.
    * @param signature server's signature of the request and response.
    * @param response server's response
    * @param requestHash hash of the request being responded to, used to look up the request.
    */
    function respond(bytes memory signature, bytes memory response, bytes32 requestHash) public {
        Pledge.Request memory rq = inbox[requestHash].request;
        Pledge.Receipt memory signed = Pledge.Receipt(rq, response, signature);
        require(inbox[requestHash].waiting, "Request not waiting");
        Pledge.requireValidServerSignature(signed, serverSigner);
        emit Receipt(rq.meta, rq.message, rq.user, rq.blockNumber, signature);
        inbox[requestHash].waiting = false;
    }

    /**
    * @dev Whether the request is waiting the inbox.
    * @param requestHash hash of the request being look up.
    */
    function waiting(bytes32 requestHash) public view returns (bool) {
        return inbox[requestHash].waiting;
    }

    /**
    * @dev Returns whether a request has been left without a response too long.
    * @param requestHash hash of the request that hasn't been responded to.
    */
    function isBroken(bytes32 requestHash) public view returns (bool) {
        return inbox[requestHash].waiting && inbox[requestHash].request.blockNumber + leeway < block.number;
    }
}