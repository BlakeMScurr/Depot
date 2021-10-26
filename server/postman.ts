import { ethers } from "ethers";
import { Request } from "../client/Requests";
import { LivelinessPledge } from '../typechain';


// Postman takes requests from our onchain inbox and brings them to the signer
export class Postman {
    private provider: ethers.providers.Provider;
    private inbox: LivelinessPledge;

    constructor(provider: ethers.providers.Provider, inbox: LivelinessPledge) {
        this.provider = provider;
        this.inbox = inbox;
    }

    async getAllRequests():Promise<Request[]> {
        let rqs: Request[] = [];
        let hashes = await this.inbox.getHashes();
        for (let i = 0; i < hashes.length; i++) {
            let hash = hashes[i];
            let rq = (await this.inbox.inbox(ethers.utils.arrayify(hash))).request
            rqs.push(Request.fromJSON(rq))
            // rqs.push(new Request(rq.meta, rq.message, rq.user, rq.blockNumber, rq.linter, rq.signature))
        }
        return rqs;
    }
}