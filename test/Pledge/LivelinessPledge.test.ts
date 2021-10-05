import { expect } from "chai";
import { ethers } from "hardhat";
import * as e from "ethers";
import { Pledge__factory, LivelinessPledge, LivelinessPledge__factory } from "../../typechain"
import { newRequest, newReceipt } from "../../client/Requests"

describe("RelayPledge", function () {
  let livelinessPledge: LivelinessPledge;
  let server: e.Signer;
  let requester: e.Signer;
  let serverAddress: string;
  this.beforeAll(async () => {
    const signers = await ethers.getSigners();
    server = signers[0];
    requester = signers[1];
    serverAddress = await server.getAddress();

    const pledge = await new Pledge__factory(server).deploy();
    const pledgeLibrary = {"contracts/Pledge/Pledge.sol:Pledge": pledge.address}

    livelinessPledge = await new LivelinessPledge__factory(pledgeLibrary, server).deploy(serverAddress, 10);
  })

  describe("LivelinessPledge", () => {
      describe("Request", () => {
        it("Should accept a valid request", async () => {
            const rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some message"), 4)
            expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
            await livelinessPledge.request(rq);
            expect(await livelinessPledge.waiting(rq.hash())).to.be.true;
        })

        it("Should reject invalid signatures", async () => {
            const rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some message"), 4)
            rq.signature = await requester.signMessage(ethers.utils.toUtf8Bytes("some random signed message"));

            expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
            await expect(livelinessPledge.request(rq)).to.be.revertedWith("Invalid signature");
            expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
        })

        it("Should reject invalid block numbers", async () => {
            const rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some message"), 0)

            const bn = await ethers.provider.getBlockNumber()
            expect(bn).to.be.gt(0);
            expect(bn).to.equal(3); // TODO: why does block number seem to default to 3? Can we rely on this?

            expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
            await expect(livelinessPledge.request(rq)).to.be.revertedWith("Enforcement period must start in the future");
            expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
        })
      })

      describe("Request", () => {
          it("Should handle valid responses", async () => {
                const rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some message"), 5)
                await livelinessPledge.request(rq);
                expect(await livelinessPledge.waiting(rq.hash())).to.be.true;
    
                const receipt = await newReceipt(server, rq, ethers.utils.arrayify(0))
                await livelinessPledge.respond(receipt.signature, receipt.response, rq.hash());
                expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
          })
      })
  })
});
