// core logic for the server
import { ethers } from 'ethers';
import { Client, ClientConfig } from 'pg';
import { messageFinder, newReceipt, newRequest, Receipt, receiptFromJSON, Request } from '../client/Requests';

export interface SiloDatabase {
    store(rq: Receipt):Promise<void>
    find(rq: messageFinder):Promise<Receipt>
    nullReceipt():Receipt
}

export async function makeSiloDB(config: ClientConfig, nullReceipt: Receipt):Promise<SiloDatabase> {
    const client = new Client(config)
    await client.connect()
    return new postgres(client, nullReceipt)
}

class postgres {
    private _nullReceipt: Receipt
    private client: Client;

    constructor(client: Client, nullReceipt: Receipt) {
        this._nullReceipt = nullReceipt;
        this.client = client;
    }

    async store(receipt: Receipt):Promise<void> {
        await this.client.query(
            'INSERT INTO receipts (userAddress, linterAddress, message, block, receipt) VALUES ($1, $2, $3, $4, $5)',
            [receipt.request.user, receipt.request.linter, receipt.request.message, receipt.request.blockNumber.toBigInt(), receipt])
    }

    // finds all receipts from a given block and finds the most recent receipt from that block before a given point
    // if there is no message before that point, find all messages from the last block with messages, and return the most recent
    async find(mf: messageFinder):Promise<Receipt> {
        let blockNum = ethers.BigNumber.from(mf.fromBlockNumber)
        if (blockNum.gt(ethers.BigNumber.from("9223372036854775807"))) {
            return Promise.reject(new Error(`Block number ${blockNum} overflows Postgres's bigint type`))
        }

        let sameBlock = await this.client.query(
            `SELECT receipt FROM receipts
            WHERE userAddress = $1
            AND linterAddress = $2
            AND block = $3`,
            [mf.byUser, mf.linter, blockNum.toBigInt()]
        )

        if (sameBlock.rows.length != 0) {
            // find all receipts before (or at) the target block
            let filtered = sameBlock.rows.map((row) => {
                return receiptFromJSON(row.receipt)
            }).filter((receipt) => {
                return compareMessages(receipt.request.message, mf.fromMessage) <= 0
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
            AND linterAddress = $2
            AND block = (
                SELECT MAX(block) FROM receipts
                WHERE block < $3
                AND userAddress = $1
                AND linterAddress = $2
            )`,
            [mf.byUser, mf.linter, blockNum.toBigInt()]
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