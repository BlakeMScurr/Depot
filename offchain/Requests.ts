import * as ethers from "ethers";

export class Request {
    meta: ethers.BytesLike;
    message: ethers.BytesLike;
    user: string;
    blockNumber: ethers.BigNumberish;
    signature: ethers.BytesLike;

    constructor(meta: ethers.BytesLike, message: ethers.BytesLike, user: string, blockNumber: number, signature: string) {
      this.meta = meta;
      this.message = message;
      this.user = user;
      this.blockNumber = blockNumber;
      this.signature = signature;
    }
  }

export async function newRequest(signer: ethers.Signer, meta: string, message: string, blockNumber: number):Promise<Request> {
    let user = await signer.getAddress();
    let _meta = ethers.utils.toUtf8Bytes(meta);
    let _message = ethers.utils.toUtf8Bytes(message);
    let encoded = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes", "address", "uint256"], [_meta, _message, user, blockNumber])
    let signature = await signer.signMessage(encoded)

    return new Request(_meta, _message, user, blockNumber, signature)
  }