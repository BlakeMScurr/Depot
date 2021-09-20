import { expect } from "chai";
import { ethers } from "hardhat";
import * as e from "ethers";
import { ExposedRelayPledge__factory, ABIHack__factory, Pledge__factory, ExposedRelayPledge } from "../../typechain"
import * as contract from "../../artifacts/contracts/Pledge/Test.sol/ExposedRelayPledge.json";

describe("RelayPledge", function () {
  let exposedRelayPledge: ExposedRelayPledge;
  let contractInterface: e.ethers.utils.Interface;
  let signers: e.Signer[];
  this.beforeAll(async () => {
    signers = await ethers.getSigners();
    const abiHack = await new ABIHack__factory(signers[0]).deploy();

    const pledge = await new Pledge__factory(signers[0]).deploy();
    const pledgeLibrary = {"contracts/Pledge/Pledge.sol:Pledge": pledge.address}

    exposedRelayPledge = await new ExposedRelayPledge__factory(pledgeLibrary, signers[0]).deploy(abiHack.address);
    contractInterface = new ethers.utils.Interface(contract.abi);
  }) 

  it("Should compare messages", async function () {
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

  // TODO: move to separate file
  class Request {
    meta: e.BytesLike;
    message: e.BytesLike;
    user: string;
    blockNumber: e.BigNumberish;
    signature: e.BytesLike;

    constructor(meta: e.BytesLike, message: e.BytesLike, user: string, blockNumber: number, signature: string) {
      this.meta = meta;
      this.message = message;
      this.user = user;
      this.blockNumber = blockNumber;
      this.signature = signature;
    }
  }

  async function newRequest(signer: e.Signer, meta: string, message: string, blockNumber: number):Promise<Request> {
    let user = await signer.getAddress();
    let _meta = ethers.utils.toUtf8Bytes(meta);
    let _message = ethers.utils.toUtf8Bytes(message);
    let encoded = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes", "address", "uint256"], [_meta, _message, user, blockNumber])
    let signature = await signer.signMessage(encoded)

    return new Request(_meta, _message, user, blockNumber, signature)
  }

  it("Should find earlier messages", async () => {
    let orderedRequests = [
      await newRequest(signers[1], "store", "0x01", 1),
      await newRequest(signers[1], "store", "0x01", 2),
      await newRequest(signers[1], "store", "0x11", 2),
      await newRequest(signers[1], "store", "0x0000", 2),
      await newRequest(signers[1], "store", "0x00", 3),
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
});
