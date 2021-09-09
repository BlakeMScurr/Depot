//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract Subscription {
    enum Model { Free, Membership, Burn }

    Model model;
    IERC20 erc20;
    address serverEthAddress;
    uint256 price;
    uint256 constant max_uint256 = 2**256 - 1;

    constructor(address _serverEthAddress, address _erc20, address _burner) {
        serverEthAddress = _serverEthAddress;
        erc20 = IERC20(_erc20);
        model = Model.Free;
        price = max_uint256;
    }

    function subscribed(address user) public view returns(bool) {
        if (model == Model.Free) {
            return true;
        } else if (model == Model.Membership) {
            return erc20.balanceOf(user) >= price;
        } else if (model == Model.Burn) {
            return false;
        }
        return false;
    }

    // ----- Admin functions -----

    function lowerPrice(uint256 newPrice) public {
        require(msg.sender == serverEthAddress, "Only the server can lower the subscription price");
        require(newPrice < price, "The subscription price may only get lower");
        price = newPrice;
    }

    function updateModel() public {
        require(msg.sender == serverEthAddress, "Only the server can change the subscription model");
        require(model != Model.Burn);
        if (model == Model.Membership) {
            model = Model.Burn;
        } else if (model == Model.Free) {
            model = Model.Membership;
        }
    }
}
