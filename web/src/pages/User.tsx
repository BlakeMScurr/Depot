import { useParams } from "solid-app-router";
import { Component, For } from "solid-js";

import hs from "../components/Header.module.css"
import Message from "../components/Message";
import { request, messageStore } from "../store";
import styles from "./User.module.css"

const User: Component = () => {
    const params = useParams();

    let [store, _] = messageStore()

    return (
        <>
            <h2 class={hs.logo}><a class={hs.logo} href="">{params.user}</a></h2>
            <div class={styles.messages}>
                <For each={store.messages.filter((m: request) => { return m.rq.from === params.user })}>{(m: request) =>
                    <div onclick={() => { window.location.assign("/m/" + m.metadata.hash) }} class={styles.content}>
                        <div>
                            <Message message={m.rq.message}></Message>
                        </div>
                        <hr/>
                    </div>
                }</For>
            </div>
        </>
    );
};

export default User;
