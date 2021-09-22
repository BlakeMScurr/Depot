import { expect } from "chai";
import { ethers } from "hardhat";
import * as e from "ethers";
import { ExposedRelayPledge__factory, RelayPledge__factory, ABIHack__factory, Pledge__factory, ExposedRelayPledge, RelayPledge } from "../../typechain"
import * as contract from "../../artifacts/contracts/Pledge/Test.sol/ExposedRelayPledge.json";
import { newRequest, findRequest, newReceipt } from "../../offchain/Requests"

describe("RelayPledge", function () {
  let exposedRelayPledge: ExposedRelayPledge;
  let relayPledge: RelayPledge;
  let contractInterface: e.ethers.utils.Interface;
  let server: e.Signer;
  let poster: e.Signer;
  let reader: e.Signer;
  this.beforeAll(async () => {
    const signers = await ethers.getSigners();
    const abiHack = await new ABIHack__factory(signers[0]).deploy();

    const pledge = await new Pledge__factory(signers[0]).deploy();
    const pledgeLibrary = {"contracts/Pledge/Pledge.sol:Pledge": pledge.address}

    relayPledge = await new RelayPledge__factory(pledgeLibrary, signers[0]).deploy(abiHack.address);
    exposedRelayPledge = await new ExposedRelayPledge__factory(pledgeLibrary, signers[0]).deploy(abiHack.address);
    contractInterface = new ethers.utils.Interface(contract.abi);

    server = signers[1];
    poster = signers[2];
    reader = signers[3];
  })

  describe("Pledge Broken", () => {
    it("Keeps pledge intact for identical withheld/relayed", async () => {
      let storeRequest = await newReceipt(
        server,
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 1),
        ethers.utils.toUtf8Bytes(""), // server response to store is irrevelant aside from signature
      )

      expect(await relayPledge.isBroken(
        [
          storeRequest,
          await newReceipt(
            server,
            await newRequest(
              reader,
              "find",
              new findRequest(1, "", await poster.getAddress()).encodeAsBytes(),
              2,
            ),
            storeRequest,
          )
        ],
        await server.getAddress(),
      ))
    })

    it("Keeps pledge intact for earlier relayed than withheld (if relayed after request bounds)", async () => {

    })

    it("Breaks pledge for withheld is before request bounds", async () => {

    })

    it("Breaks pledge for earlier withheld than relayed", async () => {

    })
  })

  describe("Validate Receipts", () => {
    async function receipts(fr?: e.ethers.BytesLike) {
      if (!fr) fr = new findRequest(1, "", await poster.getAddress()).encodeAsBytes()
      return [
        await newReceipt(
          server,
          await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 1),
          ethers.utils.toUtf8Bytes("junk (we don't care how the server responded for this test)"),
        ),
        await newReceipt(
          server,
          await newRequest(
            reader,
            "find",
            fr,
            2,
          ),
          ethers.utils.toUtf8Bytes("junk (we don't care how the server responded for this test)"),
        )
      ]
    }

    it("Allows valid receipts", async () => {
      expect(async () => {await exposedRelayPledge._validateReceipts(
        await receipts(),
        await server.getAddress(),
      )}).not.to.throw()
    })

    it("Rejects invalid args", async () => {
      await expect(exposedRelayPledge._validateReceipts(
        [(await receipts())[0]],
        await server.getAddress(),
      )).to.be.revertedWith("")

    })

    it("Rejects invalid meta fields", async () => {
      let wrongStore = await receipts()
      wrongStore[0].request.meta = ethers.utils.toUtf8Bytes("wrong")
      await expect(exposedRelayPledge._validateReceipts(
        await wrongStore,
        await server.getAddress(),
      )).to.be.revertedWith("First request must be a store request")

      let wrongFind = await receipts()
      wrongFind[1].request.meta = ethers.utils.toUtf8Bytes("wrong")
      await expect(exposedRelayPledge._validateReceipts(
        await wrongFind,
        await server.getAddress(),
      )).to.be.revertedWith("Second request must be a find request")

      let wrongOrder = await receipts()
      wrongOrder[0].request.meta = ethers.utils.toUtf8Bytes("find")
      wrongOrder[1].request.meta = ethers.utils.toUtf8Bytes("store")
      await expect(exposedRelayPledge._validateReceipts(
        await wrongOrder,
        await server.getAddress(),
      )).to.be.revertedWith("First request must be a store request")
    })

    it("Rejects invalid server signatures", async () => {
      let siggySwap = await receipts()
      // test the signature validation on the store receipt 
      let tmp = siggySwap[0].signature
      siggySwap[0].signature = siggySwap[1].signature

      await expect(exposedRelayPledge._validateReceipts(
        siggySwap,
        await server.getAddress(),
      )).to.be.revertedWith("Server signature must be valid")

      // test signature validation on the find receipt
      siggySwap[0].signature = tmp
      siggySwap[1].signature = tmp

      await expect(exposedRelayPledge._validateReceipts(
        siggySwap,
        await server.getAddress(),
      )).to.be.revertedWith("Server signature must be valid")
    })

    it("Rejects ill formated find requests", async () => {
      let badFinder = await receipts(ethers.utils.toUtf8Bytes("0x"))
      await expect(exposedRelayPledge._validateReceipts(badFinder, await server.getAddress())).to.be.revertedWith("") // TODO: assert that this is due to ABI decoding - seems like hardhat isn't able to pick up on that kind of error
    })

    it("Rejects find requests for irrelevant users", async () => {
      let badFinder = await receipts(new findRequest(1, "", await reader.getAddress()).encodeAsBytes())
      await expect(exposedRelayPledge._validateReceipts(badFinder, await server.getAddress())).to.be.revertedWith("Find and store request relate to different users")
    })

    it("Rejects store requests from earlier blocks", async () => {
      let badFinder = await receipts(new findRequest(2, "", await poster.getAddress()).encodeAsBytes())
      await expect(exposedRelayPledge._validateReceipts(badFinder, await server.getAddress())).to.be.revertedWith("Message can't be a valid response to find request: stored before find request's start block")
    })

    it("Rejects store requests from earlier in the same block", async () => {
      let badFinder = await receipts(new findRequest(1, "00", await poster.getAddress()).encodeAsBytes())
      await expect(exposedRelayPledge._validateReceipts(badFinder, await server.getAddress())).to.be.revertedWith("Message can't be a valid response to find request: stored before find request's start point within the same block")
    })

    it("Rejects find requests referring to the future", async () => {
      let store = (await receipts())[0]
      let find = await newReceipt(
        server,
        await newRequest(
          reader,
          "find",
          new findRequest(1, "", await poster.getAddress()).encodeAsBytes(),
          0,
        ),
        ethers.utils.toUtf8Bytes("junk (we don't care how the server responded for this test)"),
      )
      await expect(exposedRelayPledge._validateReceipts(
        [store, find],
        await server.getAddress()
      )).to.be.revertedWith("Find requests must refer to the past, since the server can't know what might be stored in the future")
    })
  })

  describe("Valid Relay", () => {
    it("Allows later relays", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 2)
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(true);
    })

    it("Allows exact relays", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("0"), 1)
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(true);
    })

    it("Rejects malformed relays", async () => {
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, ethers.utils.toUtf8Bytes("0")))[1]).to.equal(false);
    })

    it("Rejects non store requests as find responses", async () => {
      let relayed = await newRequest(poster, "non-store", ethers.utils.toUtf8Bytes("1"), 2)
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects responses from irrelevant users", async () => {
      let relayed = await newRequest(reader, "non-store", ethers.utils.toUtf8Bytes("1"), 2)
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects garbage signatures", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 2)
      relayed.signature = ethers.utils.toUtf8Bytes("somerandomthing")
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects invalid signatures", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 2)
      let signed = await newRequest(poster, "someothermeta", ethers.utils.toUtf8Bytes("someothermessage"), 2)
      relayed.signature = signed.signature
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects messages from earlier blocks", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 1)
      let find = new findRequest(2, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects alphabetically earlier messages", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("0"), 2)
      let find = new findRequest(2, "1", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })
  })

  describe("Compare", () => {
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
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes("01"), 1),
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes("01"), 2),
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes("11"), 2),
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes("0000"), 2),
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes("00"), 3),
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 4),
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
  })
});
