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
            expect(() => {
                handleRequest(newRequest(signers[0], "meta", ethers.utils.toUtf8Bytes("message"), 5))
            }).not.to.throw()
        })

        it("Should reject non request JSON", async () => {
            expect(() => { handleRequest({ some: "some", junk: "junk"})}).to.throw("fragment.format is not a function")
        })

        // it("Should reject non JSON", async () => {})
    })
});