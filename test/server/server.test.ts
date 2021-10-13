import * as chai from "chai";
let expect = chai.expect
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised.default)

import { ethers } from "hardhat";
import { handleRequest } from "../../server/logic";
import { newRequest } from "../../client/Requests"
import * as e from "ethers";

describe("Server", () => {
    let signers: e.Signer[];
    let provider: e.providers.Provider;
    before(async () => {
        signers = await ethers.getSigners();
        provider = await ethers.provider;
    })

    describe("Validate request", () => {
        it("Should accept valid requests", async () => {
            let bn = await ethers.provider.getBlockNumber()
            let rq = await newRequest(signers[0], "meta", ethers.utils.toUtf8Bytes("message"), bn)
            await expect(handleRequest(rq, provider)).not.to.be.rejected
        })

        it("Should reject invalid types", async () => {
            await expect(handleRequest(9, provider)).to.be.rejected
            await expect(handleRequest({ some: "some", junk: "junk"}, provider)).to.be.rejected
            let rq: any = await newRequest(signers[0], "meta", ethers.utils.toUtf8Bytes("message"), 5)
            rq.blockNumber = "bn"
            await expect(handleRequest(rq, provider)).to.be.rejected
        })

        it("Should reject invalid signatures", async () => {
            let bn = await ethers.provider.getBlockNumber()
            let rq = await newRequest(signers[0], "meta", ethers.utils.toUtf8Bytes("message"), bn)
            rq.signature = await signers[0].signMessage(ethers.utils.toUtf8Bytes("asdf"))
            await expect(handleRequest(rq, provider)).to.be.rejected
        })
        
        it("Should reject outdated requests", async() => {
            await ethers.provider.send("evm_mine", [])
            let bn = await ethers.provider.getBlockNumber()
            let rq = await newRequest(signers[0], "meta", ethers.utils.toUtf8Bytes("message"), bn-1)
            await expect(handleRequest(rq, provider)).to.be.rejectedWith("Enforcement period for offchain request must start in the future")

        })
    })
});