// core logic for the server
import { ethers } from 'ethers';
import { Client, ClientConfig } from 'pg';
import * as lpArtifact from "../artifacts/contracts/Pledge/LivelinessPledge.sol/LivelinessPledge.json";
import { findRequest, newReceipt, newRequest, Receipt, receiptFromJSON, Request } from '../client/Requests';

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

export interface SiloDatabase {
    store(rq: Request):Promise<Receipt>
    find(rq: findRequest):Promise<Receipt>
    nullReceipt():Receipt
}

export async function makeSiloDB(config: ClientConfig, signer: ethers.Signer):Promise<SiloDatabase> {
    const client = new Client(config)
    await client.connect()
    let nullReceipt = await newReceipt(signer, await newRequest(signer, "null", ethers.utils.arrayify(0), 0), ethers.utils.arrayify(0))
    return new postgres(client, signer, nullReceipt)
}

class postgres {
    private _nullReceipt: Receipt
    private signer: ethers.Signer;
    private client: Client;

    constructor(client: Client, signer: ethers.Signer, nullReceipt: Receipt) {
        this._nullReceipt = nullReceipt;
        this.client = client;
        this.signer = signer;
    }

    async store(rq: Request):Promise<Receipt> {
        let receipt = await newReceipt(this.signer, rq, ethers.utils.arrayify(0))
        await this.client.query('INSERT INTO receipts (userAddress, message, block, receipt) VALUES ($1, $2, $3, $4)', [receipt.request.user, receipt.request.message, receipt.request.blockNumber, receipt])
        return receipt
    }

    async find(rq: findRequest):Promise<Receipt> {
        let signedRequest = newRequest(this.signer, "find", rq.encodeAsBytes(), ethers.BigNumber.from(rq.fromBlockNumber).add(1))
        let receipts = await this.client.query(
            'SELECT receipt FROM receipts WHERE userAddress = $1 AND block <= $2',
            [rq.byUser, ethers.BigNumber.from(rq.fromBlockNumber).toBigInt()])
        return receiptFromJSON(receipts.rows[1].receipt);
    }
    
    nullReceipt():Receipt {
        return this._nullReceipt
    }
}