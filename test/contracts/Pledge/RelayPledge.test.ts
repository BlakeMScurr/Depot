import { expect } from "chai";
import { ethers } from "hardhat";
import * as e from "ethers";
import { ExposedRelayPledge__factory, RelayPledge__factory, ABIHack__factory, Pledge__factory, ExposedRelayPledge, RelayPledge } from "../../../typechain"
import { newRequest, findRequest, newReceipt, Request } from "../../../client/Requests"

describe("RelayPledge", function () {
  let exposedRelayPledge: ExposedRelayPledge;
  let relayPledge: RelayPledge;
  let server: e.Signer;
  let poster: e.Signer;
  let reader: e.Signer;
  let serverAddress: string;
  this.beforeAll(async () => {
    const signers = await ethers.getSigners();
    server = signers[1];
    poster = signers[2];
    reader = signers[3];
    serverAddress = await server.getAddress();

    const abiHack = await new ABIHack__factory(signers[0]).deploy();

    const pledge = await new Pledge__factory(signers[0]).deploy();
    const pledgeLibrary = {"contracts/Pledge/Pledge.sol:Pledge": pledge.address}

    relayPledge = await new RelayPledge__factory(pledgeLibrary, signers[0]).deploy(abiHack.address, serverAddress);
    exposedRelayPledge = await new ExposedRelayPledge__factory(pledgeLibrary, signers[0]).deploy(abiHack.address, serverAddress);
  })

  describe("Pledge Broken", () => {
    // --r--t-->
    //   w
    it("Keeps pledge intact for identical withheld/relayed", async () => {
      await isBrokenTest(
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 1), // withheld
        new findRequest(1, "", await poster.getAddress()), // target
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 1), // relayed
        false,
      )
    })

    // --w--r--t-->
    it("Keeps pledge intact for later relayed than withheld (if relayed before target)", async () => {
      await isBrokenTest(
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 0), // withheld
        new findRequest(2, "", await poster.getAddress()), // target
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 1), // relayed
        false,
      )
    })

    // --w--t--r-->
    it("Breaks pledge for relayed after target", async () => {
      await isBrokenTest(
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 0), // withheld
        new findRequest(1, "", await poster.getAddress()), // target
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 2), // relayed
        true,
      )
    })

    // --r--w--t-->
    it("Breaks pledge for withheld after relayed", async () => {
      await isBrokenTest(
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 1), // withheld
        new findRequest(2, "", await poster.getAddress()), // target
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 0), // relayed
        true,
      )
    })

    async function isBrokenTest(withheld: Request, target: findRequest, relayed: Request, value: boolean) {
      expect(await relayPledge.isBroken(
        await newReceipt(
          server,
          withheld,
          ethers.utils.toUtf8Bytes(""), // server response to store is irrevelant - signature is sufficient
        ),
        await newReceipt(
          server,
          await newRequest(
            reader,
            "find",
            target.encodeAsBytes(),
            10,
          ),
          relayed.encodeAsBytes(),
        )
      )).to.equal(value);
    }
  })

  describe("Validate Receipts", () => {
    async function storeReceipt() {
      return await newReceipt(
        server,
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 1),
        ethers.utils.toUtf8Bytes("junk (we don't care how the server responded for this test)"),
      )
    }

    async function findReceipt(fr?: e.ethers.BytesLike) {
      if (!fr) fr = new findRequest(1, "1", await poster.getAddress()).encodeAsBytes()
      return await newReceipt(
        server,
        await newRequest(
          reader,
          "find",
          fr,
          2,
        ),
        ethers.utils.toUtf8Bytes("junk (we don't care how the server responded for this test)"),
      )
    }

    it("Allows valid receipts", async () => {
      expect(async () => {await exposedRelayPledge._validateReceipts(
        await storeReceipt(),
        await findReceipt(),
      )}).not.to.throw()
    })

    it("Allows valid prefixes", async () => {
      expect(async () => {await exposedRelayPledge._validateReceipts(
        await storeReceipt(),
        await findReceipt(new findRequest(1, "1", await poster.getAddress(), ethers.utils.toUtf8Bytes("1")).encodeAsBytes()), // "1" utf8 encoded is the prefix and the whole message
      )}).not.to.throw()
    })

    it("Rejects invalid meta fields", async () => {
      let wrongStore = await storeReceipt()
      wrongStore.request.meta = ethers.utils.toUtf8Bytes("wrong")
      await expect(exposedRelayPledge._validateReceipts(
        await wrongStore,
        await findReceipt(),
      )).to.be.revertedWith("First request must be a store request")

      let wrongFind = await findReceipt()
      wrongFind.request.meta = ethers.utils.toUtf8Bytes("wrong")
      await expect(exposedRelayPledge._validateReceipts(
        await storeReceipt(),
        await wrongFind,
      )).to.be.revertedWith("Second request must be a find request")

      // wrong order
      await expect(exposedRelayPledge._validateReceipts(
        await findReceipt(),
        await storeReceipt(),
      )).to.be.revertedWith("First request must be a store request")
    })

    it("Rejects invalid server signatures", async () => {
      let store = await storeReceipt()
      let find = await findReceipt()

      // test the signature validation on the store receipt 
      let tmp = store.signature
      store.signature = find.signature

      await expect(exposedRelayPledge._validateReceipts(
        store,
        find,
      )).to.be.revertedWith("Server signature must be valid")

      // test signature validation on the find receipt
      store.signature = tmp
      find.signature = tmp

      await expect(exposedRelayPledge._validateReceipts(
        store,
        find,
      )).to.be.revertedWith("Server signature must be valid")
    })

    it("Rejects ill formated find requests", async () => {
      await expect(exposedRelayPledge._validateReceipts(
        await storeReceipt(),
        await findReceipt(ethers.utils.toUtf8Bytes("0x"))
      )).to.be.revertedWith("") // TODO: assert that this is due to ABI decoding - seems like hardhat isn't able to pick up on that kind of error
    })

    it("Rejects find requests for irrelevant users", async () => {
      await expect(exposedRelayPledge._validateReceipts(
        await storeReceipt(),
        await findReceipt(new findRequest(1, "", await reader.getAddress()).encodeAsBytes())
      )).to.be.revertedWith("Find and store request relate to different users")
    })

    it("Rejects store requests from later blocks", async () => {
      await expect(exposedRelayPledge._validateReceipts(
        await storeReceipt(),
        await findReceipt(new findRequest(0, "", await poster.getAddress()).encodeAsBytes()),
      )).to.be.revertedWith("Message can't be a valid response to find request: stored after find request's start block")
    })

    it("Rejects store requests from later in the same block", async () => {
      await expect(exposedRelayPledge._validateReceipts(
        await storeReceipt(),
        await findReceipt(new findRequest(1, "0", await poster.getAddress()).encodeAsBytes()),
      )).to.be.revertedWith("Message can't be a valid response to find request: stored after find request's start point within the same block")
    })

    it("Rejects find requests referring to the future", async () => {
      let store = await storeReceipt()
      let find = await newReceipt(
        server,
        await newRequest(
          reader,
          "find",
          new findRequest(1, "1", await poster.getAddress()).encodeAsBytes(),
          0,
        ),
        ethers.utils.toUtf8Bytes("junk (we don't care how the server responded for this test)"),
      )
      await expect(exposedRelayPledge._validateReceipts(
        store,
        find,
      )).to.be.revertedWith("Find requests must refer to the past, since the server can't know what might be stored in the future")
    })

    it("Rejects messages without the specified prefix", async () => {
      await expect(exposedRelayPledge._validateReceipts(
        await storeReceipt(),
        await findReceipt(new findRequest(1, "0", await poster.getAddress(), ethers.utils.toUtf8Bytes("someprefix")).encodeAsBytes()),
      )).to.be.revertedWith("Message lacks the needed prefix")
    })
  })

  describe("Valid Relay", () => {
    it("Allows earlier relays", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 1)
      let find = new findRequest(2, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(true);
    })

    it("Allows exact relays", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("0"), 1)
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(true);
    })

    it("Allows valid prefixes", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("prefix:yo"), 1)
      let find = new findRequest(2, "0", await poster.getAddress(), ethers.utils.toUtf8Bytes("prefix"))
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

    it("Rejects messages from later blocks", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 2)
      let find = new findRequest(1, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects alphabetically later messages", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 2)
      let find = new findRequest(2, "0", await poster.getAddress())
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects messages without the specified prefix", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 1)
      let find = new findRequest(2, "0", await poster.getAddress(), ethers.utils.toUtf8Bytes("someprefix"))
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
