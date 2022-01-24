import { useParams } from "solid-app-router";
import { Component, onMount } from "solid-js";
import hljs from "highlight.js";

import { request, messageStore } from "../store";
import { feltToString } from "../util";

import styles from "./StorageProof.module.css";
import { ethers } from "ethers";

const StorageProof: Component = () => {
    const params = useParams();
    let [store, _] = messageStore()

    let m = store.messages.filter((m: request) => m.metadata.hash === params.hash)[0]
    onMount(() => {
        hljs.highlightAll()
    })

    let code = `
# This code proves that the following message was stored at block ${m.metadata.block} by user (eth address) ${m.content.from}:
#
# ${feltToString(m.content.message)}

# Messages are (currently) stored on Snuggly's centralised server, but merkle root of all messages is posted to StarkNet.
# The following is a merkle proof showing that the above message is stored in a given root. You can check that this is the appropriate root by going to the snuggly contract (TODO!! actually link a contract!!!!!) on any starknet explorer.
# You can run this on your own machine with python (TODO!!: version!!!) if you install the pedersen_hash from the starkware library.

from starkware.crypto.signature.signature import pedersen_hash

# The message has the following fields encoded as cairo finite field elements:
# type, blocknumber, app, from, signature, content_length, (list of) content
let messageHash = pedersen_hash(${m.content.type}, ${m.content.blocknumber}, ${m.content.app}, ${ethers.BigNumber.from(m.content.from).toBigInt()}, ${m.content.signature}, ${m.content.message.length}, ${m.content.message})

let stateRoot = ${m.metadata.root}
print(messageHash)

print(pedersen_hash(1,2))
print(pedersen_hash(3,4))
`

    return (
        <>
            <pre><code class={"language-python " + styles.code}>{code}</code></pre>
            {/* <p class="secondary"><a class="secondary" href={`https://voyager.online/tx/${m.metadata.hash}`}>State root {m.metadata.hash}</a></p> */}
        </>
    );
};

export default StorageProof;