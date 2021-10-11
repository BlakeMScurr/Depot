// core logic for the server
import { ethers } from 'ethers';
import * as lpArtifact from "../artifacts/contracts/Pledge/LivelinessPledge.sol/LivelinessPledge.json";

const lp = new ethers.utils.Interface(lpArtifact.abi);

export function handleRequest(siloRequest: any) {
    console.log("tryna decode")
    lp.encodeFunctionData(siloRequest);
    console.log("decoded");
}