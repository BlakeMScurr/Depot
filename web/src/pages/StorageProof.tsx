import { useParams } from "solid-app-router";
import { Component } from "solid-js";

import { message, messageStore } from "../store";

const StorageProof: Component = () => {
    const params = useParams();
    let [store, _] = messageStore()

    // let m = store.messages.filter((m: message) => m.hash === params.hash)[0]

    return (
        <>
            <p>asdfasdf</p>
            {/* <p class="secondary"><a class="secondary" href={`https://voyager.online/tx/${m.metadata.hash}`}>State root {m.metadata.hash}</a></p> */}
        </>
    );
};

export default StorageProof;


