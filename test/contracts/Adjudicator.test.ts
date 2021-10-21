import { expect } from "chai";
import { ethers } from "hardhat";
import * as e from "ethers";
import { Token, Token__factory, RelayPledge, RelayPledge__factory, ABIHack__factory, Pledge__factory, LivelinessPledge__factory, Adjudicator__factory, Adjudicator, LivelinessPledge } from "../../typechain"
import { newRequest, newReceipt, messageFinder } from "../../client/Requests"

describe("RelayPledge", function () {
    let token: Token;
    let livelinessPledge: LivelinessPledge;
    let relayPledge: RelayPledge;
    let adjudicator: Adjudicator;
    
    let tokenOwner: e.Signer;
    let server: e.Signer;
    let requester: e.Signer;
    let fisherman: e.Signer;

    this.beforeAll(async () => {
        const signers = await ethers.getSigners();
        tokenOwner = signers[0];
        server = signers[1];
        requester = signers[2];
        fisherman = signers[3];
        
        token = await new Token__factory(tokenOwner).deploy();

        const pledge = await new Pledge__factory(server).deploy();
        const pledgeLibrary = {"contracts/Pledge/Pledge.sol:Pledge": pledge.address}
        livelinessPledge = await new LivelinessPledge__factory(pledgeLibrary, server).deploy(await server.getAddress(), 10);

        const abiHack = await new ABIHack__factory(server).deploy();
        relayPledge = await new RelayPledge__factory(pledgeLibrary, server).deploy(abiHack.address, await server.getAddress());

        adjudicator = await new Adjudicator__factory(server).deploy(token.address, livelinessPledge.address, relayPledge.address);
    })

    describe("Adjudicator", () => {
        it("Should have external bond methods", async () => {
            await expect(adjudicator.connect(tokenOwner).withdraw(10)).to.be.revertedWith("Ownable: caller is not the owner");
            expect(await adjudicator.lastWithdrawl()).to.be.lt(10);
        })

        it("Should slash bond when not honest", async () => {
            await token.connect(tokenOwner).transfer(adjudicator.address, 1000);

            // create receipts for dishonesty proof
            let orig = fisherman.sendTransaction
            fisherman.sendTransaction = function(transaction) {
                transaction.gasLimit = ethers.BigNumber.from(30 * 1000 * 1000);
                return orig.apply(fisherman, [transaction]);
            }

            let notHonestTransaction = await adjudicator.connect(fisherman).notHonest(
                await newReceipt(
                    server,
                    await newRequest(requester, "store", ethers.utils.toUtf8Bytes(""), 1), // witheld
                    ethers.utils.toUtf8Bytes(""), // server response to store is irrevelant - signature is sufficient
                ),
                await newReceipt(
                    server,
                    await newRequest(
                        requester,
                        "find",
                        new messageFinder(2, "", await requester.getAddress()).encodeAsBytes(), // target
                        10,
                    ),
                    (await newRequest(requester, "store", ethers.utils.toUtf8Bytes(""), 0)).encodeAsBytes(), // relayed
                )
            )

            notHonestTransaction.wait();

            expect(await token.balanceOf(adjudicator.address)).to.eq(799);
            expect(await token.balanceOf(await fisherman.getAddress())).to.eq(1);
            await token.connect(fisherman).transfer(await tokenOwner.getAddress(), 1); // clear away the tokens for the next test

        })

        it("Should slash bond when not lively", async () => {
            // add tokens to the bond
            token.connect(tokenOwner).transfer(adjudicator.address, 4000 - await (await token.balanceOf(adjudicator.address)).toNumber());

            // add a request to the inbox
            let bn = await ethers.provider.getBlockNumber()
            const rq = await newRequest(requester, "store", ethers.utils.toUtf8Bytes("some message"), bn + 2)
            await livelinessPledge.request(rq);
            expect(await livelinessPledge.waiting(rq.hash())).to.be.true;
            expect(await livelinessPledge.isBroken(rq.hash())).to.be.false;
            
            // wait for the request to become late
            for (let i = 0; i < 15; i++) {
                ethers.provider.send("evm_mine", [])
            }
            expect(await livelinessPledge.isBroken(rq.hash())).to.be.true;

            // slash the bond
            await adjudicator.connect(fisherman).notLively(rq.hash());
            expect(await token.balanceOf(adjudicator.address)).to.eq(3799);
            expect(await token.balanceOf(await fisherman.getAddress())).to.eq(1);
        })
    })
});