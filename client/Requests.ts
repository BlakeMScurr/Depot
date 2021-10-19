import * as ethers from "ethers";

export class Receipt {
  request: Request;
  response: ethers.BytesLike;
  signature: ethers.BytesLike;

  constructor(request: Request, response: ethers.BytesLike, signature: ethers.BytesLike) {
    this.request = request;
    this.response = response;
    this.signature = signature;
  }
}

export async function newReceipt(server: ethers.Signer, request: Request, response: ethers.BytesLike):Promise<Receipt> {
  let encoded = ethers.utils.defaultAbiCoder.encode(
    ["tuple(bytes, bytes, address, uint256, bytes)", "bytes"],
    [[
      request.meta,
      request.message,
      request.user,
      request.blockNumber,
      request.signature,
    ], response])
  let hashed = ethers.utils.keccak256(encoded);
  let hashBinary = ethers.utils.arrayify(hashed);
  let signature = await server.signMessage(hashBinary);

  return new Receipt(request, response, signature)
}



export class Request {
  meta: ethers.BytesLike;
  message: ethers.BytesLike;
  user: string;
  blockNumber: ethers.BigNumberish;
  signature: ethers.BytesLike;

  constructor(meta: ethers.BytesLike, message: ethers.BytesLike, user: string, blockNumber: ethers.BigNumberish, signature: string) {
    this.meta = meta;
    this.message = message;
    this.user = user;
    this.blockNumber = blockNumber;
    this.signature = signature;
  }

  encodeAsBytes() {
    return ethers.utils.defaultAbiCoder.encode(
      [
        "tuple(bytes, bytes, address, uint256, bytes)",
      ],
      [
        [
          this.meta,
          this.message,
          this.user,
          this.blockNumber,
          this.signature,
        ]
      ]
    )
  }

  hash() {
    return ethers.utils.keccak256(this.encodeAsBytes())
  }

  recoverSigner() {
    let hashBinary = encodeMessage(this.meta, this.message, this.user, this.blockNumber)

    // as per https://github.com/ethers-io/ethers.js/issues/447#issuecomment-470618705
    let messageHash = ethers.utils.hashMessage(hashBinary);
    let messageHashBytes = ethers.utils.arrayify(messageHash);
    return ethers.utils.recoverAddress(messageHashBytes, this.signature)
  }
}

function encodeMessage(meta: ethers.BytesLike, message: ethers.BytesLike, user: string, blockNumber: ethers.BigNumberish) {
  let encoded = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes", "address", "uint256"], [meta, message, user, blockNumber])
  let hashed = ethers.utils.keccak256(encoded);
  return ethers.utils.arrayify(hashed);
}

export async function newRequest(signer: ethers.Signer, meta: string, message: ethers.BytesLike, blockNumber: ethers.BigNumberish):Promise<Request> {
  let user = await signer.getAddress();
  let _meta = ethers.utils.toUtf8Bytes(meta);

  let hashBinary = encodeMessage(_meta, message, user, blockNumber)
  let signature = await signer.signMessage(hashBinary);

  return new Request(_meta, message, user, blockNumber, signature)
}

export class findRequest {
  fromBlockNumber: ethers.BigNumberish;
  fromMessage: ethers.BytesLike;
  byUser: string;
  prefix: ethers.BytesLike;

  constructor(fromBlockNumber: ethers.BigNumberish, fromMessage: string, byUser: string, prefix?: ethers.BytesLike) {
    this.fromBlockNumber = fromBlockNumber;
    this.fromMessage = ethers.utils.toUtf8Bytes(fromMessage);
    this.byUser = byUser;
    this.prefix = prefix ? prefix : ethers.utils.arrayify("0x");
  }

  encodeAsBytes() {
    return ethers.utils.defaultAbiCoder.encode(
      [
        "tuple(uint256, bytes, address, bytes)",
      ],
      [
        [
          this.fromBlockNumber,
          this.fromMessage,
          this.byUser,
          this.prefix,
        ]
      ]
    ) 
  }
}