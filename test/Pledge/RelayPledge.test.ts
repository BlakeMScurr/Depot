import { expect } from "chai";
import { ethers } from "hardhat";
import { ExposedRelayPledge__factory, ABIHack__factory, Pledge__factory, ExposedRelayPledge } from "../../typechain"

describe("RelayPledge", function () {
  let exposedRelayPledge: ExposedRelayPledge;
  this.beforeAll(async () => {
    const signers = await ethers.getSigners();
    const abiHack = await new ABIHack__factory(signers[0]).deploy();

    const pledge = await new Pledge__factory(signers[0]).deploy();
    const pledgeLibrary = {"contracts/Pledge/Pledge.sol:Pledge": pledge.address}

    exposedRelayPledge = await new ExposedRelayPledge__factory(pledgeLibrary, signers[0]).deploy(abiHack.address);
  }) 

  it("Should be able to compare messages", async function () {
    let orderedMessages = [
      ethers.utils.toUtf8Bytes("0x00"),
      ethers.utils.toUtf8Bytes("0x01"),
      ethers.utils.toUtf8Bytes("0x0000"),
      ethers.utils.toUtf8Bytes("0x0001"),
      ethers.utils.toUtf8Bytes("0x000a"),
      ethers.utils.toUtf8Bytes("0x000b"),
      ethers.utils.toUtf8Bytes("0x00a0"),
      ethers.utils.toUtf8Bytes("0xa000"),
      ethers.utils.toUtf8Bytes("0x000000"),
    ]

    for (var i = 0; i < orderedMessages.length; i++) {
      expect(await exposedRelayPledge._compare(orderedMessages[i], orderedMessages[i])).to.equal(0);
      for (var j = 0; j < orderedMessages.length; j++) {
        if (i < j) {
          expect(await exposedRelayPledge._compare(orderedMessages[i], orderedMessages[j])).to.be.lessThan(0);
          expect(await exposedRelayPledge._compare(orderedMessages[j], orderedMessages[i])).to.be.greaterThan(0);
        }
      }
    }

    expect(await exposedRelayPledge._compare(orderedMessages[0], orderedMessages[1])).to.equal(-1);
  });
});
