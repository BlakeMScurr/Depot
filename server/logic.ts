// core logic for the server
import { ethers } from 'ethers';
import { Client, ClientConfig } from 'pg';
import * as lpArtifact from "../artifacts/contracts/Pledge/LivelinessPledge.sol/LivelinessPledge.json";
import { messageFinder, newReceipt, newRequest, Receipt, receiptFromJSON, Request } from '../client/Requests';

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
    find(rq: messageFinder):Promise<Receipt>
    nullReceipt():Receipt
}

export async function makeSiloDB(config: ClientConfig, signer: ethers.Signer):Promise<SiloDatabase> {
    const client = new Client(config)
    await client.connect()
    let nullReceipt = await newReceipt(signer, await newRequest(signer, "null", ethers.utils.arrayify(0), 0, defaultLinter), ethers.utils.arrayify(0))
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

    // finds all receipts from a given block and finds the most recent receipt from that block before a given point
    // if there is no message before that point, find all messages from the last block with messages, and return the most recent
    async find(rq: messageFinder):Promise<Receipt> {
        let blockNum = ethers.BigNumber.from(rq.fromBlockNumber)
        if (blockNum.gt(ethers.BigNumber.from("9223372036854775807"))) {
            return Promise.reject(new Error(`Block number ${blockNum} overflows Postgres's bigint type`))
        }

        let signedRequest = newRequest(this.signer, "find", rq.encodeAsBytes(), blockNum, defaultLinter)
        let sameBlock = await this.client.query(
            `SELECT receipt FROM receipts
            WHERE userAddress = $1
            AND block = $2`,
            [rq.byUser, blockNum.toBigInt()]
        )

        if (sameBlock.rows.length != 0) {
            // find all receipts before (or at) the target block
            let filtered = sameBlock.rows.map((row) => {
                return receiptFromJSON(row.receipt)
            }).filter((receipt) => {
                return compareMessages(receipt.request.message, rq.fromMessage) <= 0
            })

            // return the highest receipt
            if (filtered.length > 0) {
                return filtered.reduce((p, v) => {
                    return compareMessages(p.request.message, v.request.message) > 0 ? p : v
                })
            }
        }

        let previousBlock = await this.client.query(
            `SELECT receipt FROM receipts
            WHERE userAddress = $1
            AND block = (
                SELECT MAX(block) FROM receipts
                WHERE block < $2
            )`,
            [rq.byUser, blockNum.toBigInt()]
        )

        if (previousBlock.rows.length != 0) {
            return previousBlock.rows.map((row) => {
                return receiptFromJSON(row.receipt)
            }).reduce((p, v) => {
                return compareMessages(p.request.message, v.request.message) > 0 ? p : v
            })
        }
        return this._nullReceipt
    }
    
    nullReceipt():Receipt {
        return this._nullReceipt
    }
}

export function compareMessages(a: ethers.BytesLike, b: ethers.BytesLike):number {
    if (a.length != b.length) {
        return a.length < b.length? -1 : 1;
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i] != b[i]) {
            return a[i] < b[i] ? -1: 1;
        }
    }
    return 0;
}

// The gitcoin address
export const defaultLinter = "0x8ba1f109551bD432803012645Ac136ddd64DBA72"