import { useParams } from "solid-app-router";
import { Component, For } from "solid-js";

import hs from "../components/Header.module.css"
import Message from "../components/Message";
import { message, messageStore } from "../store";
import styles from "./User.module.css"

const User: Component = () => {
    const params = useParams();

    let [store, _] = messageStore()

    return (
        <>
            <h2 class={hs.logo}><a class={hs.logo} href="">{params.user}</a></h2>
            <div class={StyleSheet.messages}>
                <For each={store.messages.filter((m: message) => { return m.from === params.user })}>{(m: message) =>
                    <div onclick={() => { window.location.assign("/m/" + m.hash) }} class={styles.content}>
                        <div>
                            <Message message={m.message}></Message>
                        </div>
                        <hr/>
                    </div>
                }</For>
            </div>
        </>
    );
};

export default User;
