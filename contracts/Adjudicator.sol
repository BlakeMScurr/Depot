//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Bond.sol";
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

    constructor(address erc20, LivelinessPledge _livelinessPledge, RelayPledge _relayPledge) Bond(erc20){
        livelinessPledge = _livelinessPledge;
        relayPledge = _relayPledge;
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
}
