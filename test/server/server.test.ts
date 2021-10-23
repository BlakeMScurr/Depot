import * as chai from "chai";
let expect = chai.expect
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised.default)

import { ethers } from "hardhat";
import { handleRequest, validateRequest } from "../../server/signer";
import { compareMessages, makeSiloDB, SiloDatabase } from "../../server/db";
import { messageFinder, newReceipt, newRequest, Receipt, Request } from "../../client/Requests"
import * as e from "ethers";
import { ABIHack__factory, OddMessage, OddMessage__factory, Pledge__factory, RelayPledge, RelayPledge__factory, TrivialLinter__factory, TrivialLinter } from "../../typechain";
import { Client } from "pg";
import { orderedMessages } from "../contracts/Pledge/RelayPledge.test";

describe("Server", () => {
    let server: e.Signer;
    let storer: e.Signer;
    let storer2: e.Signer;
    let provider: e.providers.Provider;
    let tla: string; // trivial linter address
    let trivialLinter: TrivialLinter;
    let oddMessage: OddMessage;

    before(async () => {
        let signers = await ethers.getSigners();
        server = signers[0]
        storer = signers[1]
        storer2 = signers[2]
        provider = await ethers.provider;
        trivialLinter = await new TrivialLinter__factory(server).deploy();
        oddMessage = await new OddMessage__factory(server).deploy();
        tla = trivialLinter.address;
    })

    describe("Handle request", () => {
        it("Should reject unknown request types", async () => {
            let bn = await ethers.provider.getBlockNumber()
            let rq = await newRequest(server, "junk", ethers.utils.toUtf8Bytes("message"), bn, tla)
            await expect(handleRequest(rq, provider)).to.be.rejectedWith("Unknown request type: junk")
        })
    })

    describe("Validate request", () => {
        it("Should accept valid requests", async () => {
            let bn = await ethers.provider.getBlockNumber()
            let rq = await newRequest(server, "meta", ethers.utils.toUtf8Bytes("message"), bn, tla)
            await expect(validateRequest(rq, provider)).not.to.be.rejected
        })

        it("Should reject invalid types", async () => {
            await expect(validateRequest(9, provider)).to.be.rejected
            await expect(validateRequest({ some: "some", junk: "junk"}, provider)).to.be.rejected
            let rq: any = await newRequest(server, "meta", ethers.utils.toUtf8Bytes("message"), 5, tla)
            rq.blockNumber = "bn"
            await expect(validateRequest(rq, provider)).to.be.rejected
        })

        it("Should reject invalid signatures", async () => {
            let bn = await ethers.provider.getBlockNumber()
            let rq = await newRequest(server, "meta", ethers.utils.toUtf8Bytes("message"), bn, tla)
            rq.signature = await server.signMessage(ethers.utils.toUtf8Bytes("asdf"))
            await expect(validateRequest(rq, provider)).to.be.rejected
        })
        
        it("Should reject outdated requests", async() => {
            await ethers.provider.send("evm_mine", [])
            let bn = await ethers.provider.getBlockNumber()
            let rq = await newRequest(server, "meta", ethers.utils.toUtf8Bytes("message"), bn-1, tla)
            await expect(validateRequest(rq, provider)).to.be.rejectedWith("Enforcement period for offchain request must start in the future")

        })
    })

    describe("Database", () => {
        let db: SiloDatabase;
        let hello: Receipt;
        let helloAgain: Receipt;
        let finalMessageTL: Receipt; // final main user trivial linter message
        let relayPledge: RelayPledge;
        before(async () => {
            // TODO: make test db in the style of https://stackoverflow.com/a/61725901/7371580
            let config = { database: "testsilo" }
            db = await makeSiloDB(
                config,
                await newReceipt(server, await newRequest(server, "null", ethers.utils.arrayify(0), 0, tla), ethers.utils.arrayify(0)),
            )

            // TODO: simplify so that we don't make two clients (one here and one inside makeSiloDB)
            const client = new Client(config)
            await client.connect()
            await client.query('TRUNCATE TABLE receipts')

            hello = await newReceipt(server, await newRequest(storer, "store", ethers.utils.toUtf8Bytes("Hello!"), 1, tla), ethers.utils.arrayify(0))
            helloAgain = await newReceipt(server, await newRequest(storer, "store", ethers.utils.toUtf8Bytes("Hello again!"), 2, tla), ethers.utils.arrayify(0))
            finalMessageTL = await newReceipt(server, await newRequest(storer, "store", ethers.utils.toUtf8Bytes("Final message here"), 2, tla), ethers.utils.arrayify(0))

            const abiHack = await new ABIHack__factory(server).deploy();

            const pledge = await new Pledge__factory(server).deploy();
            const pledgeLibrary = {"contracts/Pledge/Pledge.sol:Pledge": pledge.address}

            relayPledge = await new RelayPledge__factory(pledgeLibrary, server).deploy(abiHack.address, await server.getAddress());
        })

        it("Should find nothing if nothing is stored", async () => {
            expect(
                await db.find(new messageFinder(5, "", await storer.getAddress(), tla))
            ).to.deep.equal(db.nullReceipt())
        })

        it("Should find the most recent of two stored messages", async () => {
            await db.store(hello)
            await db.store(helloAgain)

            let fr = new messageFinder(3, "", await storer.getAddress(), tla)
            let findReceipt = await newReceipt(server, await newRequest(server, "find", fr.encodeAsBytes(), 4, tla), helloAgain.request.encodeAsBytes())

            expect(
                await db.find(fr)
            ).to.eql(helloAgain)

            expect(await relayPledge.isBroken(
                hello,
                findReceipt,
            )).to.equal(false);

            expect(await relayPledge.isBroken(
                helloAgain,
                findReceipt,
            )).to.equal(false);
        })

        it("Should not find messages from later blocks", async () => {
            expect(
                await db.find(new messageFinder(0, "", await storer.getAddress(), tla))
            ).to.deep.equal(db.nullReceipt())
        })

        it("Should not find messages from later in a block", async () => {
            expect(
                await db.find(new messageFinder(1, "Hellp", await storer.getAddress(), tla))
            ).to.deep.equal(db.nullReceipt())
        })

        let testQuery = async (fr: messageFinder, expected: Receipt) => {
            let findReceipt = await newReceipt(server, await newRequest(server, "find", fr.encodeAsBytes(), 4, fr.linter), expected.request.encodeAsBytes())
            expect(
                await db.find(fr)
            ).to.deep.equal(expected)

            expect(await relayPledge.isBroken(
                expected,
                findReceipt,
            )).to.equal(false);
        }

        it("Should find the first of two cross block messages", async () => {
            // from the target message
            await testQuery(new messageFinder(1, "Hello!", await storer.getAddress(), tla), hello)
            
            // from later in the earlier block
            await testQuery(new messageFinder(1, "Hello!!", await storer.getAddress(), tla), hello)

            // from earlier in the later block
            await testQuery(new messageFinder(2, "", await storer.getAddress(), tla), hello)

            // from immediately before the message in the later block
            await testQuery(new messageFinder(2, "Hello again ", await storer.getAddress(), tla), hello)
        })

        it("Should find the first of two messages in the same block", async () => {
            // Store another message in block 2, after the current block
            await db.store(finalMessageTL)

            // from the earlier message
            await testQuery(new messageFinder(2, "Hello again!", await storer.getAddress(), tla), helloAgain)
            
            // from between the messages
            await testQuery(new messageFinder(2, "middling length", await storer.getAddress(), tla), helloAgain)
            
            // from immediately before the later message
            await testQuery(new messageFinder(2, "Final message herd", await storer.getAddress(), tla), helloAgain)
            
            // from later message
            await testQuery(new messageFinder(2, "Final message here", await storer.getAddress(), tla), finalMessageTL)
        })

        it("Should only find requests for a given linter", async () => {
                // Store a request from another linter early in the history
                let oddLinterRequest = await newReceipt(server, await newRequest(storer, "store", ethers.utils.toUtf8Bytes("odd"), 0, oddMessage.address), ethers.utils.arrayify(0))
                await db.store(oddLinterRequest)

                // can still find the most recent request for the trivial linter
                await testQuery(new messageFinder(3, "", await storer.getAddress(), tla), finalMessageTL)

                // odd linter finds its own request from the same point
                await testQuery(new messageFinder(3, "", await storer.getAddress(), oddMessage.address), oddLinterRequest)
        })

        it("Should only find messages from a given user", async () => {
            // Store a request from another user early in the history
            let newUserRequest = await newReceipt(server, await newRequest(storer2, "store", ethers.utils.toUtf8Bytes("other user"), 0, tla), ethers.utils.arrayify(0))
            await db.store(newUserRequest)

            // can still find the most recent request from the storer
            await testQuery(new messageFinder(3, "", await storer.getAddress(), tla), finalMessageTL)

            // odd linter finds its own request from the same point
            await testQuery(new messageFinder(3, "", await storer2.getAddress(), tla), newUserRequest)
        })

        it("Should catch integer overflows", async () => {
            let serverAddress = await server.getAddress()
            return expect(
                db.find(new messageFinder(
                    ethers.BigNumber.from("9223372036854775808"),
                    "",
                    serverAddress,
                    tla,
                ))
            ).to.be.rejectedWith("Block number 9223372036854775808 overflows Postgres's bigint type")
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