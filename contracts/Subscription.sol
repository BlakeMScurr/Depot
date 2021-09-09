//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Subscription {
    IERC20 erc20;
    uint256 constant max_uint256 = 2**256 - 1;
    address serverEthAddress;
    uint256 constant month = 4 * 60 * 24 * 30; // a month in terms of a 15 second block time

    enum Model { Free, Membership, Burn }
    Model model;
    uint256 price;
    mapping(address=>uint256) expires;

    constructor(address _serverEthAddress, address _erc20) {
        serverEthAddress = _serverEthAddress;
        erc20 = IERC20(_erc20);
        model = Model.Free;
        price = max_uint256;
    }

    function isSubscribed(address user) public view returns(bool) {
        if (model == Model.Free) {
            return true;
        } else if (model == Model.Membership) {
            return erc20.balanceOf(user) >= price;
        } else if (model == Model.Burn) {
            return block.number < expires[user];
        }
        return false;
    }

    function subscribe(uint256 amount) public {
        erc20.transferFrom(msg.sender, address(0), amount);

        // You can only buy whole numbers of months, so that people don't just buy a single block's worth to appear to have subscribed
        uint256 extraSubscription = (amount / price) * month;
        if (expires[msg.sender] < block.number) {
            expires[msg.sender] = block.number + extraSubscription;
        } else {
            expires[msg.sender] = expires[msg.sender] + extraSubscription;
        }
    }

    // ----- Admin functions -----

    function lowerPrice(uint256 newPrice) public {
        require(msg.sender == serverEthAddress, "Only the server can lower the subscription price");
        require(newPrice < price, "The subscription price may only get lower");
        price = newPrice;
    }

    // The server can update the subscription model, but only ever in one direction:
    // It starts free in the testing phase, moving to membership to drive early adoption/investment, and finally to proof of burn for a steady state that rewards the server and investors
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
