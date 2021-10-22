//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Pledge/Pledge.sol";

/**
 * @title Contract that validiates a request according to some arbitrary
 */
interface RequestValidator {
    function validRequest(Pledge.Request memory) external pure returns (bool);
}

/**
 * @title Request validator that always returns true
 * @dev Usually the default validator except in the context of specific apps
 */
contract TrivialValidator {
    function validRequest(Pledge.Request memory) external pure returns (bool) {
        return true;
    }
}

/**
 * @title Request validator that always returns false
 */
contract NullValidator {
    function validRequest(Pledge.Request memory) external pure returns (bool) {
        return false;
    }
}

/**
 * @title Request validator that returns whether the message length is odd
 * @dev Not useful for much except testing and demos.
 */
contract OddMessage {
    function validRequest(Pledge.Request memory r) external pure returns (bool) {
        return r.message.length % 2 == 1;
    }
}

/**
 * @title Trivial validator that happens to be impure
 * @dev Used to test whether impure functions can still be used as validators (it appears it cannot)
 */
contract ImpureValidator {
    uint a;
    function validRequest(Pledge.Request memory) external returns (bool) {
        a = 2;
        return true;
    }
}