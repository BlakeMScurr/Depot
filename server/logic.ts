// core logic for the server
import { ethers } from 'ethers';
import * as lpArtifact from "../artifacts/contracts/Pledge/LivelinessPledge.sol/LivelinessPledge.json";
import { findRequest, newReceipt, Receipt, Request } from '../client/Requests';

const lp = new ethers.utils.Interface(lpArtifact.abi);

export async function handleRequest(siloRequest: any, provider: ethers.providers.Provider) {
    validateRequest(siloRequest, provider)
    let rq: Request = siloRequest;
    switch (ethers.utils.toUtf8String(rq.meta)) {
        case "store":
        case "find":
        default:
            throw new Error("Unknown request type: " + ethers.utils.toUtf8String(rq.meta))
    }
}

export async function validateRequest(siloRequest: any, provider: ethers.providers.Provider) {
    lp.encodeFunctionData("request", [siloRequest]);
    let r: Request = siloRequest

    if (r.recoverSigner() != r.user) {
        throw new Error("Invalid signature")
    }

    let bn = await provider.getBlockNumber()
    if (r.blockNumber < bn) {
        throw new Error("Enforcement period for offchain request must start in the future")
    }
}

export class memoryDB {
    storage: Map<string, Array<Request>>;

    constructor() {
        this.storage = new Map()
    }

    store(rq: Request):Receipt {
        if (!this.storage.get(rq.user)) this.storage.set(rq.user, [])
        newReceipt()
        this.storage.get(rq.user)?.push()
    }

    find(rq: findRequest):Receipt {

    }
}

export interface db {
    store(rq: Request):Receipt
    find(rq: findRequest):Receipt
}