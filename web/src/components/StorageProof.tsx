import { useParams } from "solid-app-router";
import { Component, createResource, onMount } from "solid-js";
import hljs from "highlight.js";

import styles from "./StorageProof.module.css";
import { ethers } from "ethers";

const StorageProof: Component = (props) => {
    let m = props.message

    onMount(() => {
        hljs.highlightAll()
    })

    
    let merkle_proof = ""
    m.metadata.branches.forEach(branch => {
        if (branch.left) {
            merkle_proof += `next_hash = pedersen_hash(next_hash, ${branch.value})`
        } else {
            merkle_proof += `next_hash = pedersen_hash(next_hash, ${branch.value})`
        }
        merkle_proof += "\n"
    });
    

    let code = `
from starkware.crypto.signature.signature import pedersen_hash

# utility function to hash the method
def chain_hash(vals):
    hash = pedersen_hash(vals[0], vals[1])
    for val in vals[2:]:
        hash = pedersen_hash(hash, val)
    return hash

# The message has the following fields encoded as cairo finite field elements:
# type, blocknumber, app, sender, signature, content length, content (as a list)
next_hash = chain_hash([${m.rq.type}, ${m.rq.blocknumber}, ${ethers.BigNumber.from(m.rq.sender).toBigInt()}, ${m.rq.signature}, ${m.rq.message.length}, ${m.rq.message}])

state_root = ${m.metadata.root}

${merkle_proof}

assert next_hash == state_root
`

    return (
        <>
            <p class="primary">This code proves the message was stored on Snuggly servers. The merkle root is posted to <a class="primary" href={"https://voyager.online/tx/snuggly" + m.metadata.hash }>Starknet.</a></p>
            <pre><code class={"language-python " + styles.code}>{code}</code></pre>
        </>
    );
};

export default StorageProof;