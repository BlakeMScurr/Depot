import { expect } from "chai";
import { ethers } from "hardhat";
import * as e from "ethers";
import { ExposedRelayPledge__factory, ABIHack__factory, Pledge__factory, ExposedRelayPledge } from "../../typechain"
import * as contract from "../../artifacts/contracts/Pledge/Test.sol/ExposedRelayPledge.json";
import { Request, newRequest, findRequest } from "../../offchain/Requests"

describe("RelayPledge", function () {
  let exposedRelayPledge: ExposedRelayPledge;
  let contractInterface: e.ethers.utils.Interface;
  let server: e.Signer;
  let poster: e.Signer;
  let reader: e.Signer;
  this.beforeAll(async () => {
    const signers = await ethers.getSigners();
    const abiHack = await new ABIHack__factory(signers[0]).deploy();

    const pledge = await new Pledge__factory(signers[0]).deploy();
    const pledgeLibrary = {"contracts/Pledge/Pledge.sol:Pledge": pledge.address}

    exposedRelayPledge = await new ExposedRelayPledge__factory(pledgeLibrary, signers[0]).deploy(abiHack.address);
    contractInterface = new ethers.utils.Interface(contract.abi);

    server = signers[1];
    poster = signers[2];
    reader = signers[3];
  }) 

  it("Compares messages", async function () {
    let orderedMessages = [
      ethers.utils.toUtf8Bytes(""),
      ethers.utils.toUtf8Bytes("0"),
      ethers.utils.toUtf8Bytes("1"),
      ethers.utils.toUtf8Bytes("00"),
      ethers.utils.toUtf8Bytes("01"),
      ethers.utils.toUtf8Bytes("0a"),
      ethers.utils.toUtf8Bytes("0b"),
      ethers.utils.toUtf8Bytes("a0"),
      ethers.utils.toUtf8Bytes("b0"),
      ethers.utils.toUtf8Bytes("000"),
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

  it("Finds earlier messages", async () => {
    let orderedRequests = [
      await newRequest(poster, "store", "01", 1),
      await newRequest(poster, "store", "01", 2),
      await newRequest(poster, "store", "11", 2),
      await newRequest(poster, "store", "0000", 2),
      await newRequest(poster, "store", "00", 3),
      await newRequest(poster, "store", "", 4),
    ];

    for (var i = 0; i < orderedRequests.length; i++) {
      expect(await exposedRelayPledge._messageIsEarlier(orderedRequests[i], orderedRequests[i])).to.equal(false);
      for (var j = 0; j < orderedRequests.length; j++) {
        if (i < j) {
          expect(await exposedRelayPledge._messageIsEarlier(orderedRequests[i], orderedRequests[j])).to.equal(true);
          expect(await exposedRelayPledge._messageIsEarlier(orderedRequests[j], orderedRequests[i])).to.equal(false);
        }
      }
    }
  })

  describe("Valid Relay", () => {
    it("Allows later relays", async () => {
      let relayed = await newRequest(poster, "store", "1", 2)
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(true);
    })

    it("Allows exact relays", async () => {
      let relayed = await newRequest(poster, "store", "0", 1)
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(true);
    })

    it("Rejects malformed relays", async () => {
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, ethers.utils.toUtf8Bytes("0")))[1]).to.equal(false);
    })

    it("Rejects non store requests as find responses", async () => {
      let relayed = await newRequest(poster, "non-store", "1", 2)
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects responses from irrelevant users", async () => {
      let relayed = await newRequest(reader, "non-store", "1", 2)
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects garbage signatures", async () => {
      let relayed = await newRequest(poster, "store", "1", 2)
      relayed.signature = ethers.utils.toUtf8Bytes("somerandomthing")
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects invalid signatures", async () => {
      let relayed = await newRequest(poster, "store", "1", 2)
      let signed = await newRequest(poster, "someothermeta", "someothermessage", 2)
      relayed.signature = signed.signature
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects messages from earlier blocks", async () => {
      let relayed = await newRequest(poster, "store", "1", 1)
      let find = new findRequest(2, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects alphabetically earlier messages", async () => {
      let relayed = await newRequest(poster, "store", "0", 2)
      let find = new findRequest(2, "1", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })
  })
});
