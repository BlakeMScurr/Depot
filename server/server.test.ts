import { expect } from "chai";
import { ethers } from "ethers";
import { handleRequest } from "./logic";

describe("Server", () => {
    describe("Validate request", () => {
        // it("Should reject non JSON", async () => {})

        it("Should reject non request JSON", async () => {
            expect(() => { handleRequest({ some: "some", junk: "junk"})}).to.throw("fragment.format is not a function")
        })
    })
});