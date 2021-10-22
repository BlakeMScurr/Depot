//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Pledge/Pledge.sol";

/**
 * @title Contract that validiates a request according to some arbitrary
 */
interface RequestLinter {
    function validRequest(Pledge.Request memory) external pure returns (bool);
}

/**
 * @title Request linter that always returns true
 * @dev Usually the default linter except in the context of specific apps
 */
contract TrivialLinter {
    function validRequest(Pledge.Request memory) external pure returns (bool) {
        return true;
    }
}

/**
 * @title Request linter that always returns false
 */
contract NullLinter {
    function validRequest(Pledge.Request memory) external pure returns (bool) {
        return false;
    }
}

/**
 * @title Request linter that returns whether the message length is odd
 * @dev Not useful for much except testing and demos.
 */
contract OddMessage {
    function validRequest(Pledge.Request memory r) external pure returns (bool) {
        return r.message.length % 2 == 1;
    }
}

/**
 * @title Trivial linter that happens to be impure
 * @dev Used to test whether impure functions can still be used as linters (it appears it cannot)
 */
contract ImpureLinter {
    uint a;
    function validRequest(Pledge.Request memory) external returns (bool) {
        a = 2;
        return true;
    }
}