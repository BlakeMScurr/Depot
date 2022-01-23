import { useParams } from "solid-app-router";
import { Component, onMount } from "solid-js";
import hljs from "highlight.js";

import { message, messageStore } from "../store";

const StorageProof: Component = () => {
    const params = useParams();
    let [store, _] = messageStore()

    let m = store.messages.filter((m: message) => m.metadata.hash === params.hash)[0]
    onMount(() => {
        hljs.highlightAll()
    })

    let code = `
# This code proves that the message was stored at block ${m.metadata.block}.
# The state root of all messages is publicly posted to StarkNet, and the
# following is a merkle proof relating the state root to the message.

from starkware.crypto.signature.signature import pedersen_hash

let stateRoot = ${m.metadata.root}
let message = ${JSON.stringify(m.content)}
let felt_endocded_message = 
let messageHash = pedersen_hash(1, 2, 3, 4, 5)
print(messageHash)

print(pedersen_hash(1,2))
print(pedersen_hash(3,4))
`

    return (
        <>
            <pre><code class="language-python">{code}</code></pre>
            {/* <p class="secondary"><a class="secondary" href={`https://voyager.online/tx/${m.metadata.hash}`}>State root {m.metadata.hash}</a></p> */}
        </>
    );
};

export default StorageProof;