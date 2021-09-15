// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./Pledge.sol";

interface IPledge {
    function isBroken(Pledge.Receipt[] memory) external view returns (bool);
}
