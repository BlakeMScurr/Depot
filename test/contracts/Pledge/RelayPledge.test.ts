import { expect } from "chai";
import { ethers } from "hardhat";
import * as e from "ethers";
import { ExposedRelayPledge__factory, RelayPledge__factory, ABIHack__factory, Pledge__factory, ExposedRelayPledge, RelayPledge, TrivialLinter__factory } from "../../../typechain"
import { newRequest, messageFinder, newReceipt, Request } from "../../../client/Requests"

describe("RelayPledge", function () {
  let exposedRelayPledge: ExposedRelayPledge;
  let relayPledge: RelayPledge;
  let server: e.Signer;
  let poster: e.Signer;
  let reader: e.Signer;
  let serverAddress: string;
  let tva: string; // trivial linter address
  this.beforeAll(async () => {
    const signers = await ethers.getSigners();
    server = signers[1];
    poster = signers[2];
    reader = signers[3];
    serverAddress = await server.getAddress();

    const abiHack = await new ABIHack__factory(server).deploy();

    const pledge = await new Pledge__factory(server).deploy();
    const pledgeLibrary = {"contracts/Pledge/Pledge.sol:Pledge": pledge.address}

    relayPledge = await new RelayPledge__factory(pledgeLibrary, server).deploy(abiHack.address, serverAddress);
    exposedRelayPledge = await new ExposedRelayPledge__factory(pledgeLibrary, server).deploy(abiHack.address, serverAddress);
    tva = (await new TrivialLinter__factory(server).deploy()).address;

  })

  describe("Pledge Broken", () => {
    // --r--t-->
    //   w
    it("Keeps pledge intact for identical withheld/relayed", async () => {
      await isBrokenTest(
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 1, tva), // withheld
        new messageFinder(1, "", await poster.getAddress(), tva), // target
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 1, tva), // relayed
        false,
      )
    })

    // --w--r--t-->
    it("Keeps pledge intact for later relayed than withheld (if relayed before target)", async () => {
      await isBrokenTest(
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 0, tva), // withheld
        new messageFinder(2, "", await poster.getAddress(), tva), // target
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 1, tva), // relayed
        false,
      )
    })

    // --w--t--r-->
    it("Breaks pledge for relayed after target", async () => {
      await isBrokenTest(
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 0, tva), // withheld
        new messageFinder(1, "", await poster.getAddress(), tva), // target
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 2, tva), // relayed
        true,
      )
    })

    // --r--w--t-->
    it("Breaks pledge for withheld after relayed", async () => {
      await isBrokenTest(
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 1, tva), // withheld
        new messageFinder(2, "", await poster.getAddress(), tva), // target
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 0, tva), // relayed
        true,
      )
    })

    async function isBrokenTest(withheld: Request, target: messageFinder, relayed: Request, value: boolean) {
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
            tva,
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
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 1, tva),
        ethers.utils.toUtf8Bytes("junk (we don't care how the server responded for this test)"),
      )
    }

    async function findReceipt(fr?: e.ethers.BytesLike) {
      if (!fr) fr = new messageFinder(1, "1", await poster.getAddress(), tva).encodeAsBytes()
      return await newReceipt(
        server,
        await newRequest(
          reader,
          "find",
          fr,
          2,
          tva,
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
        await findReceipt(new messageFinder(1, "", await reader.getAddress(), tva).encodeAsBytes())
      )).to.be.revertedWith("Find and store request relate to different users")
    })

    it("Rejects store requests from later blocks", async () => {
      await expect(exposedRelayPledge._validateReceipts(
        await storeReceipt(),
        await findReceipt(new messageFinder(0, "", await poster.getAddress(), tva).encodeAsBytes()),
      )).to.be.revertedWith("Message can't be a valid response to find request: stored after find request's start block")
    })

    it("Rejects store requests from later in the same block", async () => {
      await expect(exposedRelayPledge._validateReceipts(
        await storeReceipt(),
        await findReceipt(new messageFinder(1, "0", await poster.getAddress(), tva).encodeAsBytes()),
      )).to.be.revertedWith("Message can't be a valid response to find request: stored after find request's start point within the same block")
    })

    it("Rejects find requests referring to the future", async () => {
      let store = await storeReceipt()
      let find = await newReceipt(
        server,
        await newRequest(
          reader,
          "find",
          new messageFinder(1, "1", await poster.getAddress(), tva).encodeAsBytes(),
          0,
          tva,
        ),
        ethers.utils.toUtf8Bytes("junk (we don't care how the server responded for this test)"),
      )
      await expect(exposedRelayPledge._validateReceipts(
        store,
        find,
      )).to.be.revertedWith("Find requests must refer to the past, since the server can't know what might be stored in the future")
    })

    it("Rejects invalid business logic addresses", async () => {
      await expect(exposedRelayPledge._validateReceipts(
        await storeReceipt(),
        await findReceipt(new messageFinder(1, "1", await poster.getAddress(), exposedRelayPledge.address).encodeAsBytes())
      )).to.be.revertedWith("Message is for a different contract than finder")
    })
  })

  describe("Valid Relay", () => {
    it("Allows earlier relays", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 1, tva)
      let find = new messageFinder(2, "0", await poster.getAddress(), tva)
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(true);
    })

    it("Allows exact relays", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("0"), 1, tva)
      let find = new messageFinder(1, "0", await poster.getAddress(), tva)
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(true);
    })

    it("Rejects malformed relays", async () => {
      let find = new messageFinder(1, "0", await poster.getAddress(), tva)
      expect((await exposedRelayPledge._validRelay(find, ethers.utils.toUtf8Bytes("0")))[1]).to.equal(false);
    })

    it("Rejects non store requests as find responses", async () => {
      let relayed = await newRequest(poster, "non-store", ethers.utils.toUtf8Bytes("1"), 2, tva)
      let find = new messageFinder(1, "0", await poster.getAddress(), tva)
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects responses from irrelevant users", async () => {
      let relayed = await newRequest(reader, "non-store", ethers.utils.toUtf8Bytes("1"), 2, tva)
      let find = new messageFinder(1, "0", await poster.getAddress(), tva)
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects garbage signatures", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 2, tva)
      relayed.signature = ethers.utils.toUtf8Bytes("somerandomthing")
      let find = new messageFinder(1, "0", await poster.getAddress(), tva)
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects invalid signatures", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 2, tva)
      let signed = await newRequest(poster, "someothermeta", ethers.utils.toUtf8Bytes("someothermessage"), 2, tva)
      relayed.signature = signed.signature
      let find = new messageFinder(1, "0", await poster.getAddress(), tva)
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects messages from later blocks", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 2, tva)
      let find = new messageFinder(1, "0", await poster.getAddress(), tva)
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects alphabetically later messages", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 2, tva)
      let find = new messageFinder(2, "0", await poster.getAddress(), tva)
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })

    it("Rejects messages without the specified businessLogic contract", async () => {
      let relayed = await newRequest(poster, "store", ethers.utils.toUtf8Bytes("1"), 1, tva)
      let find = new messageFinder(2, "0", await poster.getAddress(), exposedRelayPledge.address)
      expect((await exposedRelayPledge._validRelay(find, relayed.encodeAsBytes()))[1]).to.equal(false);
    })
  })

  describe("Compare", () => {
    it("Compares messages", async function () {
      let om = orderedMessages()
  
      for (var i = 0; i < om.length; i++) {
        expect(await exposedRelayPledge._compare(om[i], om[i])).to.equal(0);
        for (var j = 0; j < om.length; j++) {
          if (i < j) {
            expect(await exposedRelayPledge._compare(om[i], om[j])).to.be.lessThan(0);
            expect(await exposedRelayPledge._compare(om[j], om[i])).to.be.greaterThan(0);
          }
        }
      }
  
      expect(await exposedRelayPledge._compare(om[0], om[1])).to.equal(-1);
    });
  
    it("Finds earlier messages", async () => {
      let orderedRequests = [
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes("01"), 1, tva),
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes("01"), 2, tva),
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes("11"), 2, tva),
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes("0000"), 2, tva),
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes("00"), 3, tva),
        await newRequest(poster, "store", ethers.utils.toUtf8Bytes(""), 4, tva),
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

export function orderedMessages() {
  return [
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
}