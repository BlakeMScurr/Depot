import { expect } from "chai";
import { ethers } from "hardhat";
import * as e from "ethers";
import { Token, Bond, Bond__factory, Token__factory, ExposedBond, ExposedBond__factory } from "../../typechain"

describe("RelayPledge", function () {
    let token: Token
    let bond: Bond
    let exposedBond: ExposedBond;

    let tokenOwner: e.Signer;
    let server: e.Signer;
    let donater: e.Signer;
    let slasher: e.Signer;
    this.beforeAll(async () => {
        const signers = await ethers.getSigners();
        tokenOwner = signers[0];
        server = signers[1];
        donater = signers[2];
        slasher = signers[3];
        
        token = await new Token__factory(tokenOwner).deploy();
        bond = await new Bond__factory(server).deploy(token.address);
        exposedBond = await new ExposedBond__factory(server).deploy(token.address);
    })

    describe("Bond", () => {
        it("Should allow people to lock up funds", async () => {
            await token.connect(tokenOwner).transfer(bond.address, 201);
            expect(await token.balanceOf(bond.address)).to.eq(201);
        })

        it("Should allow the server to withdraw funds", async () => {
            // Test ownability - only the server can withdraw
            await expect(bond.connect(donater).withdraw(201)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(bond.connect(tokenOwner).withdraw(201)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(bond.connect(server).withdraw(201)).not.to.be.revertedWith("Ownable: caller is not the owner");
            
            // Test amount - the server can only withdraw 1/200 of the total
            await expect(bond.connect(server).withdraw(201)).to.be.revertedWith("At most you can withdraw the monthly allowance");
            await expect(bond.connect(server).withdraw(2)).to.be.revertedWith("At most you can withdraw the monthly allowance");
            await expect(bond.connect(server).withdraw(1)).not.to.be.revertedWith("At most you can withdraw the monthly allowance");
            
            // Test timing - the server can only withdraw once per month
            await expect(bond.connect(server).withdraw(1)).to.be.revertedWith("You must wait a month to withdraw your monthly allowance");
           
            // TODO: uncomment once performant block updates are implemented in hardhat https://github.com/nomiclabs/hardhat/issues/1112

            // const blockPerMonth = 172800;
            // let bn = await ethers.provider.getBlockNumber();
            // let lw = await bond.lastWithdrawl();
            // while (bn < blockPerMonth + lw.toNumber() - 1) {
            //     await ethers.provider.send("evm_mine", [])
            // }
            // await expect(bond.connect(server).withdraw(1)).to.be.revertedWith("You must wait a month to withdraw your monthly allowance");
            // await ethers.provider.send("evm_mine", [])

            // expect(await token.balanceOf(await server.getAddress())).to.eq(0);
            // await expect(bond.connect(server).withdraw(1)).not.to.be.reverted("");
            // expect(await token.balanceOf(await server.getAddress())).to.eq(1);

            // await expect(bond.connect(server).withdraw(1)).to.be.revertedWith("You must wait a month to withdraw your monthly allowance");
        })

        it("Should slash appropriately", async () => {
            // slashing 100% of the funds gives no rewards to the slasher
            await token.connect(tokenOwner).transfer(exposedBond.address, 100);
            expect(await token.balanceOf(exposedBond.address)).to.eq(100);

            await exposedBond.connect(slasher)._slash(1, 1);
            expect(await token.balanceOf(exposedBond.address)).to.eq(0);
            expect(await token.balanceOf(await slasher.getAddress())).to.eq(0);
            
            // slashing 25% of 800 tokens burns 200 and gives 1 to the slasher, leaving the server with 199
            await token.connect(tokenOwner).transfer(exposedBond.address, 800);
            expect(await token.balanceOf(exposedBond.address)).to.eq(800);
            
            await exposedBond.connect(slasher)._slash(1, 4);
            expect(await token.balanceOf(exposedBond.address)).to.eq(599);
            expect(await token.balanceOf(await slasher.getAddress())).to.eq(1);
        })
    })
});