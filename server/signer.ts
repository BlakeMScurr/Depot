import { ethers } from 'ethers';
import { decodeMessageFinder, messageFinder, newReceipt, Receipt, Request } from '../client/Requests';
import * as lpArtifact from "../artifacts/contracts/Pledge/LivelinessPledge.sol/LivelinessPledge.json";
import { SiloDatabase } from './db';
import { RequestLinter__factory } from '../typechain';

const lp = new ethers.utils.Interface(lpArtifact.abi);
export class ReceiptSigner {
    signer: ethers.Signer;
    provider: ethers.providers.Provider;
    db: SiloDatabase;
    constructor (signer: ethers.Signer, provider: ethers.providers.Provider, db: SiloDatabase) {
        this.signer = signer;
        this.provider = provider;
        this.db = db;
    }

    async handleRequest(siloRequest: any) {
        await this.validateRequest(siloRequest)
        let rq: Request = siloRequest;

        switch (ethers.utils.toUtf8String(rq.meta)) {
            case "store":
                let receipt = await newReceipt(this.signer, rq, ethers.utils.arrayify(0));
                await this.db.store(receipt);
                return receipt;
            case "find":
                let finder = decodeMessageFinder(rq.message);
                let storeReceipt = await this.db.find(finder);
                return await newReceipt(this.signer, rq, storeReceipt.request.encodeAsBytes());
            default:
                throw new Error("Unknown request type: " + ethers.utils.toUtf8String(rq.meta))
        }
    }
    
    async validateRequest(siloRequest: any) {
        lp.encodeFunctionData("request", [siloRequest]);
        let r: Request = siloRequest
    
        if (r.recoverSigner() != r.user) {
            throw new Error("Invalid signature")
        }

        if(!await RequestLinter__factory.connect(r.linter, this.provider).validRequest(r)) {
            throw new Error("Invalid request format: failed lint")
        }
    
        let bn = await this.provider.getBlockNumber()
        if (r.blockNumber.lt(bn)) {
            throw new Error("Enforcement period for offchain request must start in the future")
        }
    }
}

