import { expect } from "chai";
import { ethers } from "hardhat";
import * as e from "ethers";
import { Pledge__factory, Pledge, ExposedPledgeLibrary__factory, ExposedPledgeLibrary, TrivialLinter__factory } from "../../../typechain"
import { newRequest, newReceipt } from "../../../client/Requests"

describe("RelayPledge", function () {
    let pledge: ExposedPledgeLibrary;
    let server: e.Signer;
    let user: e.Signer;
    let serverAddress: string;
    let tva: string; // trivial linter address
    this.beforeAll(async () => {
        const signers = await ethers.getSigners();
        server = signers[0];
        user = signers[1];
        serverAddress = await server.getAddress();
        const pledgeLibrary = {"contracts/Pledge/Pledge.sol:Pledge": (await new Pledge__factory(server).deploy()).address}
        pledge = await new ExposedPledgeLibrary__factory(pledgeLibrary, server).deploy();
        tva = (await new TrivialLinter__factory(server).deploy()).address;
    })

    describe("Pledge", () => {
        it("Should allow valid user signatures on requests", async () => {
            const rq = await newRequest(user, "meta", ethers.utils.toUtf8Bytes("some message"), 0, tva);
            expect(await pledge.validUserSignature(rq)).to.be.true;
        })

        it("Should reject invalid signatures", async () => {
            const rq = await newRequest(user, "meta", ethers.utils.toUtf8Bytes("some message"), 0, tva);
            rq.signature = await user.signMessage(ethers.utils.toUtf8Bytes("some other message"));
            expect(await pledge.validUserSignature(rq)).to.be.false;

            rq.signature = ethers.utils.toUtf8Bytes("some ill formatted signature");
            await(expect(pledge.validUserSignature(rq)).to.be.revertedWith("ECDSA: invalid signature length")); // TODO: just return false here
        })

        it("Should allow valid server signatures on requests", async () => {
            const rq = await newRequest(user, "meta", ethers.utils.toUtf8Bytes("some message"), 0, tva);
            const receipt = await newReceipt(server, rq, ethers.utils.toUtf8Bytes("some response"));
            await(expect(pledge.requireValidServerSignature(receipt, await server.getAddress())).not.to.be.revertedWith(""));
        })

        it("Should reject invalid server signatures", async () => {
            const rq = await newRequest(user, "meta", ethers.utils.toUtf8Bytes("some message"), 0, tva);
            const receipt = await newReceipt(server, rq, ethers.utils.toUtf8Bytes("some response"));
            receipt.signature = await user.signMessage(ethers.utils.toUtf8Bytes("some other message"));
            await(expect(pledge.requireValidServerSignature(receipt, await server.getAddress())).to.be.revertedWith("Server signature must be valid"));
            receipt.signature = ethers.utils.toUtf8Bytes("some ill formatted signature");
            await(expect(pledge.requireValidServerSignature(receipt, await server.getAddress())).to.be.revertedWith("ECDSA: invalid signature length"));
        })

    })
});