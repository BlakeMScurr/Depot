//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Bond.sol";
import "./BusinessLogic.sol";
import "./Pledge/LivelinessPledge.sol";
import "./Pledge/RelayPledge.sol";

/**
 * @title The Adjudicator keeps a server lively and honest.
 * @dev Using the adjudicator, users can force the server to store and relay
 * messages. If 
 */
contract Adjudicator is Bond {
    LivelinessPledge livelinessPledge;
    RelayPledge relayPledge;
    address server;
    mapping(RequestLinter => bool) linters;

    constructor(address erc20, LivelinessPledge _livelinessPledge, RelayPledge _relayPledge, address _server) Bond(erc20){
        livelinessPledge = _livelinessPledge;
        relayPledge = _relayPledge;
        server = _server;
    }

    /**
     * @dev Slash 5% of the bond if the server isn't lively
     */
    mapping(bytes32 => bool) guiltyLivelyVerdicts;
    function notLively(bytes32 requestHash) public {
        if (!guiltyLivelyVerdicts[requestHash] && livelinessPledge.isBroken(requestHash)) {
            super.slash(1, 20);
            guiltyLivelyVerdicts[requestHash] = true;
        }
    }

    /**
    * @dev Slash 20% of the bond if the server isn't honest
    * i.e., it lies by ommiting to relay a store request
    */
    mapping(bytes32 => bool) guiltyRelayVerdicts;
    function notHonest(Pledge.Receipt memory storeReceipt, Pledge.Receipt memory findReceipt) public {
        bytes32 requestHash = keccak256(abi.encode(storeReceipt.request, findReceipt.request));
        if (!guiltyRelayVerdicts[requestHash] && relayPledge.isBroken(storeReceipt, findReceipt)) {
            super.slash(1, 5);
            guiltyRelayVerdicts[requestHash] = true;
        }
    }

    /**
    * @dev Slash 20% of the bond if the server lets invalid requests through
    * i.e., if the server pledges that it will only allow valid requests according
    * to specific onchain logic, and it signs receipts for requests that break that
    * logic.
    */
    mapping(bytes32 => bool) guiltyValidVerdicts;
    function notValid(Pledge.Receipt memory receipt) public {
        require(linters[receipt.request.businessLogic], "Linter has not been approved by the Silo operator"); // the owner must manually approve linters - it's easy to write a malicious linter
        Pledge.requireValidServerSignature(receipt, server);
        bytes32 hash = keccak256(abi.encode(receipt));
        if (!guiltyValidVerdicts[hash] && !receipt.request.businessLogic.validRequest(receipt.request)) {
            super.slash(1, 5);
            guiltyValidVerdicts[hash] = true;
        }
    }

    /**
    * @dev Pledge to abide by given logic when signing receipts
    */
    function addLinter(RequestLinter linter) external onlyOwner {
        linters[linter] = true;
    }

    /**
    * @dev Convenience function to see which linters binding
    */
    function hasLinter(RequestLinter linter) external view returns (bool){
        return linters[linter];
    }
}
