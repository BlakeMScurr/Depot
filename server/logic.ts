// core logic for the server
import { ethers } from 'ethers';
import * as lpArtifact from "../artifacts/contracts/Pledge/LivelinessPledge.sol/LivelinessPledge.json";
import { Request } from '../client/Requests';

const lp = new ethers.utils.Interface(lpArtifact.abi);
export function handleRequest(siloRequest: any) {
    lp.encodeFunctionData("request", [siloRequest]);
    let r: Request = siloRequest

    if (r.recoverSigner() != r.user) {
        throw new Error("Invalid signature")
    }
}