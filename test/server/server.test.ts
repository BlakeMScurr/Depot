import * as chai from "chai";
let expect = chai.expect
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised.default)

import { ethers } from "hardhat";
import { handleRequest, makeSiloDB, SiloDatabase, validateRequest } from "../../server/logic";
import { findRequest, newReceipt, newRequest, Receipt, Request } from "../../client/Requests"
import * as e from "ethers";
import { ABIHack__factory, Pledge__factory, RelayPledge, RelayPledge__factory } from "../../typechain";

describe("Server", () => {
    let server: e.Signer;
    let finder: e.Signer;
    let storer: e.Signer;
    let provider: e.providers.Provider;
    before(async () => {
        let signers = await ethers.getSigners();
        server = signers[0]
        finder = signers[1]
        storer = signers[2]
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
            db = await makeSiloDB(
                { database: "testsilo" },
                server,
            )

            hello = await newRequest(finder, "find", ethers.utils.toUtf8Bytes("Hello!"), 1)
            helloAgain = await newRequest(finder, "find", ethers.utils.toUtf8Bytes("Hello again!"), 2)

            const abiHack = await new ABIHack__factory(server).deploy();

            const pledge = await new Pledge__factory(server).deploy();
            const pledgeLibrary = {"contracts/Pledge/Pledge.sol:Pledge": pledge.address}

            relayPledge = await new RelayPledge__factory(pledgeLibrary, server).deploy(abiHack.address, await server.getAddress());
        })

        it("Should find nothing if nothing is stored", async () => {
            expect(
                await db.find(new findRequest(5, "", await server.getAddress(), ethers.utils.arrayify(0)))
            ).to.deep.equal(db.nullReceipt())
        })

        it("Should find the most recent of two stored messages", async () => {
            let h = await db.store(hello)
            let ha = await db.store(helloAgain)
            expect(h).to.deep.equal(newReceipt(server, hello, ethers.utils.arrayify(0)))
            expect(ha).to.deep.equal(newReceipt(server, helloAgain, ethers.utils.arrayify(0)))

            let fr = new findRequest(3, "", await server.getAddress(), ethers.utils.arrayify(0))
            let findReceipt = await newReceipt(server, await newRequest(server, "find", fr.encodeAsBytes(), 4), helloAgain.encodeAsBytes())

            expect(
                await db.find(fr)
            ).to.deep.equal(findReceipt)

            expect(await relayPledge.isBroken(
                h,
                findReceipt,
            )).to.equal(false);

            expect(await relayPledge.isBroken(
                ha,
                findReceipt,
            )).to.equal(false);
        })

        it("Should not find messages from later blocks", async () => {
            expect(
                await db.find(new findRequest(0, "", await server.getAddress(), ethers.utils.arrayify(0)))
            ).to.deep.equal(db.nullReceipt())
        })

        it("Should not find messages from later in a block", async () => {
            expect(
                await db.find(new findRequest(1, "Hellp", await server.getAddress(), ethers.utils.arrayify(0)))
            ).to.deep.equal(db.nullReceipt())
        })

        it("Should find the middle of two messages", async () => {
            let fr = new findRequest(1, "Hello!", await server.getAddress(), ethers.utils.arrayify(0))

            let findReceipt = await newReceipt(server, await newRequest(server, "find", fr.encodeAsBytes(), 2), hello.encodeAsBytes())
            expect(
                await db.find(fr)
            ).to.deep.equal(findReceipt)

            expect(
                await db.find(new findRequest(1, "Hello", await server.getAddress(), ethers.utils.arrayify(0)))
            ).to.deep.equal(findReceipt)

            expect(await relayPledge.isBroken(
                await newReceipt(server, hello, ethers.utils.arrayify(0)),
                findReceipt,
            )).to.equal(false);
        })

    })
});