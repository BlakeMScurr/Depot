//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IPledge.sol";

contract FindByUser {
    function isBroken(Pledge.SignedRequest[] memory) external view returns (bool) {
        
    }
}