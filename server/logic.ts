// core logic for the server
import { ethers } from 'ethers';
import * as lpArtifact from "../artifacts/contracts/Pledge/LivelinessPledge.sol/LivelinessPledge.json";
import { findRequest, newReceipt, newRequest, Receipt, Request } from '../client/Requests';

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
    // Map from user to blockNumber to ordered list of receipts (ordered by message text)
    storage: Map<string, Map<string, Array<[ethers.Bytes, Receipt]>>>;
    // Receipt used to respond to find requests that don't find anything
    emptyReceipt: Receipt;

    constructor(emptyReceipt: Receipt) {
        this.storage = new Map()
        this.emptyReceipt = emptyReceipt;
    }

    store(receipt: Receipt, user: string, blockNumber: string, message: ethers.Bytes) {
        // find the right user/block part of storage
        if (!this.storage.get(user)) this.storage.set(user, new Map())
        let userMap: Map<string, Array<[ethers.Bytes, Receipt]>> = this.storage.get(user)!;
        if (!userMap.get(blockNumber)) userMap.set(blockNumber, [])
        let messages = userMap.get(blockNumber)!;

        // add request in order
        let i = sortedIndex(message, messages)
        messages.splice(i, 0, [message, receipt])
    }

    find(rq: findRequest):Receipt {
        let userMap = this.storage.get(rq.byUser);
        if (userMap) {
            let messages = userMap.get(rq.fromBlockNumber.toString())
            if (messages) {
                for (let i = messages.length -1; i >= 0; i--) {
                    const m = messages[i];
                    // TODO: is this equivalent to prefix searching through bytes in the contract? Probably not.
                    if (m[0].toString().startsWith(rq.prefix.toString())) {
                        return m[1]
                    }
                }
            }
        }
        return this.emptyReceipt;
    }
}

// credit https://stackoverflow.com/a/21822316/7371580
function sortedIndex(message: ethers.Bytes, list: Array<[ethers.Bytes, Receipt]>) {
    var low = 0,
        high = list.length;

    while (low < high) {
        var mid = (low + high) >>> 1;
        if (lt(list[mid][0], message)) low = mid + 1;
        else high = mid;
    }
    return low;
}

function lt(a: ethers.Bytes, b: ethers.Bytes):boolean {
    if (a.length != b.length) return a.length < b.length
    for (let i = 0; i < a.length; i++) {
        if (a[i] != b[i]) {
            return a[i] < b[i];
        }
    }
    return false
}

export interface db {
    store(rq: Request):Receipt
    find(rq: findRequest):Receipt
}