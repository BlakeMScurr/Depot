import * as chai from "chai";
let expect = chai.expect
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised.default)

import { ethers } from "hardhat";
import { compareMessages, handleRequest, makeSiloDB, SiloDatabase, validateRequest } from "../../server/logic";
import { findRequest, newReceipt, newRequest, Receipt, Request } from "../../client/Requests"
import * as e from "ethers";
import { ABIHack__factory, Pledge__factory, RelayPledge, RelayPledge__factory } from "../../typechain";
import { Client } from "pg";
import { orderedMessages } from "../contracts/Pledge/RelayPledge.test";

describe("Server", () => {
    let server: e.Signer;
    let storer: e.Signer;
    let provider: e.providers.Provider;
    before(async () => {
        let signers = await ethers.getSigners();
        server = signers[0]
        storer = signers[1]
        provider = await ethers.provider;
    })

    describe("Handle request", () => {
        it("Should reject unknown request types", async () => {
            let bn = await ethers.provider.getBlockNumber()
            let rq = await newRequest(server, "junk", ethers.utils.toUtf8Bytes("message"), bn)
            await expect(handleRequest(rq, provider)).to.be.rejectedWith("Unknown request type: junk")
        })
    })

    describe("Validate request", () => {
        it("Should accept valid requests", async () => {
            let bn = await ethers.provider.getBlockNumber()
            let rq = await newRequest(server, "meta", ethers.utils.toUtf8Bytes("message"), bn)
            await expect(validateRequest(rq, provider)).not.to.be.rejected
        })

        it("Should reject invalid types", async () => {
            await expect(validateRequest(9, provider)).to.be.rejected
            await expect(validateRequest({ some: "some", junk: "junk"}, provider)).to.be.rejected
            let rq: any = await newRequest(server, "meta", ethers.utils.toUtf8Bytes("message"), 5)
            rq.blockNumber = "bn"
            await expect(validateRequest(rq, provider)).to.be.rejected
        })

        it("Should reject invalid signatures", async () => {
            let bn = await ethers.provider.getBlockNumber()
            let rq = await newRequest(server, "meta", ethers.utils.toUtf8Bytes("message"), bn)
            rq.signature = await server.signMessage(ethers.utils.toUtf8Bytes("asdf"))
            await expect(validateRequest(rq, provider)).to.be.rejected
        })
        
        it("Should reject outdated requests", async() => {
            await ethers.provider.send("evm_mine", [])
            let bn = await ethers.provider.getBlockNumber()
            let rq = await newRequest(server, "meta", ethers.utils.toUtf8Bytes("message"), bn-1)
            await expect(validateRequest(rq, provider)).to.be.rejectedWith("Enforcement period for offchain request must start in the future")

        })
    })

    describe("database", () => {
        let db: SiloDatabase;
        let hello: Request;
        let helloAgain: Request;
        let relayPledge: RelayPledge;
        before(async () => {
            // TODO: make test db in the style of https://stackoverflow.com/a/61725901/7371580
            let config = { database: "testsilo" }
            db = await makeSiloDB(
                config,
                server,
            )

            // TODO: simplify so that we don't make two clients (one here and one inside makeSiloDB)
            const client = new Client(config)
            await client.connect()
            await client.query('TRUNCATE TABLE receipts')

            hello = await newRequest(storer, "store", ethers.utils.toUtf8Bytes("Hello!"), 1)
            helloAgain = await newRequest(storer, "store", ethers.utils.toUtf8Bytes("Hello again!"), 2)

            const abiHack = await new ABIHack__factory(server).deploy();

            const pledge = await new Pledge__factory(server).deploy();
            const pledgeLibrary = {"contracts/Pledge/Pledge.sol:Pledge": pledge.address}

            relayPledge = await new RelayPledge__factory(pledgeLibrary, server).deploy(abiHack.address, await server.getAddress());
        })

        it("Should find nothing if nothing is stored", async () => {
            expect(
                await db.find(new findRequest(5, "", await storer.getAddress()))
            ).to.deep.equal(db.nullReceipt())
        })

        it("Should find the most recent of two stored messages", async () => {
            let hStoreReceipt = await db.store(hello)
            let haStoreReceipt = await db.store(helloAgain)
            expect(hStoreReceipt).to.deep.equal(await newReceipt(server, hello, ethers.utils.arrayify(0)))
            expect(haStoreReceipt).to.deep.equal(await newReceipt(server, helloAgain, ethers.utils.arrayify(0)))

            let fr = new findRequest(3, "", await storer.getAddress())
            let findReceipt = await newReceipt(server, await newRequest(server, "find", fr.encodeAsBytes(), 4), helloAgain.encodeAsBytes())

            expect(
                await db.find(fr)
            ).to.eql(haStoreReceipt)

            expect(await relayPledge.isBroken(
                hStoreReceipt,
                findReceipt,
            )).to.equal(false);

            expect(await relayPledge.isBroken(
                haStoreReceipt,
                findReceipt,
            )).to.equal(false);
        })

        it("Should not find messages from later blocks", async () => {
            expect(
                await db.find(new findRequest(0, "", await storer.getAddress()))
            ).to.deep.equal(db.nullReceipt())
        })

        it("Should not find messages from later in a block", async () => {
            expect(
                await db.find(new findRequest(1, "Hellp", await storer.getAddress()))
            ).to.deep.equal(db.nullReceipt())
        })

        it("Should find the first of two cross block messages", async () => {
            let testQuery = async (fr: findRequest) => {
                let storeReceipt = await newReceipt(server, hello, ethers.utils.arrayify(0))
                let findReceipt = await newReceipt(server, await newRequest(server, "find", fr.encodeAsBytes(), 3), hello.encodeAsBytes())
                expect(
                    await db.find(fr)
                ).to.deep.equal(storeReceipt)

                expect(await relayPledge.isBroken(
                    storeReceipt,
                    findReceipt,
                )).to.equal(false);
            }

            // from the target message
            await testQuery(new findRequest(1, "Hello!", await storer.getAddress()))

            
            // from later in the earlier block
            await testQuery(new findRequest(1, "Hello!!", await storer.getAddress()))

            // from earlier in the later block
            await testQuery(new findRequest(2, "", await storer.getAddress()))

            // from immediately before the message in the later block
            await testQuery(new findRequest(2, "Hello again ", await storer.getAddress()))
        })
    })

    describe("Offchain comparison", () => {
        it("Should compare exactly as the onchain function does", async () => {
            let om = orderedMessages()
            for (var i = 0; i < om.length; i++) {
                expect(compareMessages(om[i], om[i])).to.equal(0);
                for (var j = 0; j < om.length; j++) {
                  if (i < j) {
                    expect(compareMessages(om[i], om[j])).to.be.lessThan(0);
                    expect(compareMessages(om[j], om[i])).to.be.greaterThan(0);
                  }
                }
              }
        })
    })
});