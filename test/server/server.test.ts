import { expect } from "chai";
import { ethers } from "hardhat";
import { handleRequest } from "../../server/logic";
import { newRequest } from "../../client/Requests"
import * as e from "ethers";

describe("Server", () => {
    let signers: e.Signer[];
    before(async () => {
        signers = await ethers.getSigners();
    })

    describe("Validate request", () => {
        it("Should accept valid requests", async () => {
            let rq = await newRequest(signers[0], "meta", ethers.utils.toUtf8Bytes("message"), 5)
            expect(() => {
                handleRequest(rq)
            }).not.to.throw()
        })

        it("Should reject invalid types", async () => {
            expect(() => { handleRequest(9)}).to.throw()
            expect(() => { handleRequest({ some: "some", junk: "junk"})}).to.throw()
            let rq: any = await newRequest(signers[0], "meta", ethers.utils.toUtf8Bytes("message"), 5)
            rq.blockNumber = "bn"
            expect(() => { handleRequest(rq)}).to.throw()
        })

        it("Should reject invalid signatures", async () => {
            let rq = await newRequest(signers[0], "meta", ethers.utils.toUtf8Bytes("message"), 5)
            rq.signature = await signers[0].signMessage(ethers.utils.toUtf8Bytes("asdf"))
            expect(() => { handleRequest(rq)}).to.throw("Invalid signature")
        })
    })
});