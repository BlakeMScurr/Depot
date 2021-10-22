import { expect } from "chai";
import { ethers } from "hardhat";
import * as e from "ethers";
import { Pledge__factory, LivelinessPledge, LivelinessPledge__factory, ImpureLinter, ImpureLinter__factory, TrivialLinter__factory, TrivialLinter, NullLinter, OddMessage, NullLinter__factory, OddMessage__factory, RequestLinter } from "../../../typechain"
import { newRequest, newReceipt } from "../../../client/Requests"

describe("RelayPledge", function () {
  let livelinessPledge: LivelinessPledge;
  let trivialLinter: TrivialLinter;
  let tva: string; // trivial linter address
  let nullLinter: NullLinter;
  let oddMessage: OddMessage;
  let impureLinter: ImpureLinter;

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
    trivialLinter = await new TrivialLinter__factory(server).deploy();
    tva = trivialLinter.address;
    nullLinter = await new NullLinter__factory(server).deploy();
    oddMessage = await new OddMessage__factory(server).deploy();
    impureLinter = await new ImpureLinter__factory(server).deploy();

  })

  describe("LivelinessPledge", () => {
      describe("Request", () => {
        it("Should accept a valid request", async () => {
            const bn = await ethers.provider.getBlockNumber()
            const rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some message"), bn + 1, tva);
            expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
            await livelinessPledge.request(rq);
            expect(await livelinessPledge.waiting(rq.hash())).to.be.true;
        })

        it("Should reject invalid signatures", async () => {
            const rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some message"), 4, tva)
            rq.signature = await requester.signMessage(ethers.utils.toUtf8Bytes("some random signed message"));

            expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
            await expect(livelinessPledge.request(rq)).to.be.revertedWith("Invalid signature");
            expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
        })

        it("Should reject invalid block numbers", async () => {
            const bn = await ethers.provider.getBlockNumber()
            const rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some message"), bn - 1, tva)

            expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
            await expect(livelinessPledge.request(rq)).to.be.revertedWith("Enforcement period must start in the future");
            expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
        })
      })

      describe("Request", () => {
            it("Should handle valid responses", async () => {
                const bn = await ethers.provider.getBlockNumber()
                const rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some message"), bn + 1, tva)
                await livelinessPledge.request(rq);
                expect(await livelinessPledge.waiting(rq.hash())).to.be.true;
    
                const receipt = await newReceipt(server, rq, ethers.utils.arrayify(0))
                await livelinessPledge.respond(receipt.signature, receipt.response, rq.hash());
                expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
            })

            it("Should not allow invalid hash lookups", async () => {
                const rq1 = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some new"), 5, tva)
                const rq2 = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some new message"), 5, tva)
                expect(await livelinessPledge.waiting(rq1.hash())).to.be.false;
                expect(await livelinessPledge.waiting(rq2.hash())).to.be.false;

                const receipt1 = await newReceipt(server, rq1, ethers.utils.arrayify(0))
                const receipt2 = await newReceipt(server, rq2, ethers.utils.arrayify(0))
                await expect(livelinessPledge.respond(receipt1.signature, receipt1.response, rq1.hash())).to.be.revertedWith("Request not waiting");
                await expect(livelinessPledge.respond(receipt2.signature, receipt2.response, rq1.hash())).to.be.revertedWith("Request not waiting");
                expect(await livelinessPledge.waiting(rq1.hash())).to.be.false;
                expect(await livelinessPledge.waiting(rq2.hash())).to.be.false;
            })

            it("Should require valid server signatures", async () => {
                const bn = await ethers.provider.getBlockNumber()
                const rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some message"), bn + 1, tva)
                await livelinessPledge.request(rq);
                expect(await livelinessPledge.waiting(rq.hash())).to.be.true;

                const receipt = await newReceipt(server, rq, ethers.utils.arrayify(0))
                receipt.signature = await server.signMessage(ethers.utils.toUtf8Bytes("some random signed message"));
                await expect(livelinessPledge.respond(receipt.signature, receipt.response, rq.hash())).to.be.revertedWith("Server signature must be valid");
                expect(await livelinessPledge.waiting(rq.hash())).to.be.true;
            })
        })
    })

    describe("Late", () => {
        it("Should catch late responses", async () => {
            // Add a request to the inbox, the pledge is not yet broken
            const bn = await ethers.provider.getBlockNumber()
            const rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some message"), bn + 1, tva)
            await livelinessPledge.request(rq);
            expect(await livelinessPledge.waiting(rq.hash())).to.be.true;
            expect(await livelinessPledge.isBroken(rq.hash())).to.be.false;
            
            // Response is almost late
            for (let i = 0; i < 10; i++) {
                await ethers.provider.send("evm_mine", [])
            }
            expect(await ethers.provider.getBlockNumber()).to.gte(bn+10);
            expect(await livelinessPledge.isBroken(rq.hash())).to.be.false;
            
            // Response is now late and the pledge is broken
            await ethers.provider.send("evm_mine", [])
            expect(await ethers.provider.getBlockNumber()).to.gte(bn+11);
            expect(await livelinessPledge.isBroken(rq.hash())).to.be.true;

            // Pledge isn't broken after responding to the request
            const receipt = await newReceipt(server, rq, ethers.utils.arrayify(0))
            await livelinessPledge.respond(receipt.signature, receipt.response, rq.hash());
            expect(await livelinessPledge.isBroken(rq.hash())).to.be.false;

        })
    })

    describe("Business Logic", () => {
        it("Should gate the inbox according to the business logic contracts", async () => {
            let attempt = async (message: string, linter: RequestLinter, succeed: boolean) => {
              const bn = await ethers.provider.getBlockNumber()
              const rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes(message), bn + 1, linter.address);

              // Does it pass the linter?
              expect(await linter.validRequest(rq)).to.eq(succeed);

              // Does it get into the inbox?
              expect(await livelinessPledge.waiting(rq.hash())).to.be.false;
              await livelinessPledge.request(rq);
              expect(await livelinessPledge.waiting(rq.hash())).to.eq(succeed);
            }

            await attempt("", nullLinter, false)
            await attempt("", oddMessage, false)
            await attempt("odd", nullLinter, false)

            await attempt("", trivialLinter, true)
            await attempt("odd", oddMessage, true)

            let rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes(""), await ethers.provider.getBlockNumber() + 1, await server.getAddress());
            await expect(livelinessPledge.request(rq)).to.be.revertedWith("function call to a non-contract account");

            rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes(""), await ethers.provider.getBlockNumber() + 1, livelinessPledge.address);
            await expect(livelinessPledge.request(rq)).to.be.revertedWith("function selector was not recognized and there's no fallback function");

            rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes(""), await ethers.provider.getBlockNumber() + 1, impureLinter.address);
            // TODO: inform hardhat
            await expect(livelinessPledge.request(rq)).to.be.revertedWith("Transaction reverted and Hardhat couldn't infer the reason. Please report this to help us improve Hardhat.");
        })
    })
});