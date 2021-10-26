import * as ethers from "ethers";

// TODO: use custom JSON deserializer that handles BytesLike
function fixBytesLike(thing: any):ethers.BytesLike {
  if (typeof thing === 'object') {
    let entries: [string, string][] = Object.entries(thing)
    return Uint8Array.from(entries.map((v) => { return parseInt(v[1])}))
  }
  return ethers.utils.arrayify(thing);
}

export function receiptFromJSON(json: any) {
  let receipt = new Receipt(
    Request.fromJSON(json.request),
    fixBytesLike(json.response),
    json.signature,
  )
  return receipt
}

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
    ["tuple(bytes, bytes, address, uint256, address, bytes)", "bytes"],
    [[
      request.meta,
      request.message,
      request.user,
      request.blockNumber,
      request.linter,
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
  blockNumber: ethers.BigNumber;
  linter: string;
  signature: ethers.BytesLike;

  constructor(meta: ethers.BytesLike, message: ethers.BytesLike, user: string, blockNumber: ethers.BigNumberish, linter: string, signature: string) {
    this.meta = meta;
    this.message = message;
    this.user = user;
    this.blockNumber = ethers.BigNumber.from(blockNumber);
    this.linter = linter;
    this.signature = signature;
  }

  encodeAsBytes() {
    return ethers.utils.defaultAbiCoder.encode(
      [
        Request.abi(),
      ],
      [
        [
          this.meta,
          this.message,
          this.user,
          this.blockNumber,
          this.linter,
          this.signature,
        ]
      ]
    )
  }

  hash() {
    return ethers.utils.keccak256(this.encodeAsBytes())
  }

  recoverSigner() {
    let hashBinary = encodeMessage(this.meta, this.message, this.user, this.blockNumber, this.linter)

    // as per https://github.com/ethers-io/ethers.js/issues/447#issuecomment-470618705
    let messageHash = ethers.utils.hashMessage(hashBinary);
    let messageHashBytes = ethers.utils.arrayify(messageHash);
    return ethers.utils.recoverAddress(messageHashBytes, this.signature)
  }

  static abi():string {
    return "tuple(bytes, bytes, address, uint256, address, bytes)";
  }

  static fromJSON(json: any):Request {
    return new Request(
      fixBytesLike(json.meta),
      fixBytesLike(json.message),
      json.user,
      json.blockNumber,
      json.linter,
      json.signature,
    )
  }
}

function encodeMessage(meta: ethers.BytesLike, message: ethers.BytesLike, user: string, blockNumber: ethers.BigNumberish, linter: string) {
  let encoded = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes", "address", "uint256", "address"], [meta, message, user, blockNumber, linter])
  let hashed = ethers.utils.keccak256(encoded);
  return ethers.utils.arrayify(hashed);
}

export async function newRequest(signer: ethers.Signer, meta: string, message: ethers.BytesLike, blockNumber: ethers.BigNumberish, linter: string):Promise<Request> {
  let user = await signer.getAddress();
  let _meta = ethers.utils.toUtf8Bytes(meta);

  let hashBinary = encodeMessage(_meta, message, user, blockNumber, linter)
  let signature = await signer.signMessage(hashBinary);

  return new Request(_meta, message, user, blockNumber, linter, signature)
}

export class messageFinder {
  fromBlockNumber: ethers.BigNumberish;
  fromMessage: ethers.BytesLike;
  byUser: string;
  linter: string;

  constructor(fromBlockNumber: ethers.BigNumberish, fromMessage: string, byUser: string, linter: string) {
    this.fromBlockNumber = ethers.BigNumber.from(fromBlockNumber);
    this.fromMessage = ethers.utils.toUtf8Bytes(fromMessage);
    this.byUser = byUser;
    this.linter = linter;
  }

  encodeAsBytes() {
    return ethers.utils.defaultAbiCoder.encode(
      [
        messageFinderABI,
      ],
      [
        [
          this.fromBlockNumber,
          this.fromMessage,
          this.byUser,
          this.linter,
        ]
      ]
    ) 
  }
}

const messageFinderABI = "tuple(uint256, bytes, address, address)"

export function decodeMessageFinder (bytes: ethers.utils.BytesLike):messageFinder {
  let result = ethers.utils.defaultAbiCoder.decode([messageFinderABI], bytes)[0]
  return new messageFinder(result[0], ethers.utils.toUtf8String(result[1]), result[2], result[3])
}