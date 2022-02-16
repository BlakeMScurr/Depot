import { useParams } from "solid-app-router";
import { Component, createEffect, createResource, createSignal, Show } from "solid-js";

import hs from "../components/Header.module.css"
import Message from "../components/Message";
import StorageProof from "../components/StorageProof";
import { getMessage } from "../store";
import { hex } from "../util";
import styles from "./Message.module.css"

const User: Component = () => {
    const params = useParams();

    let [m] = createResource(getMessage(params.hash))

    // from https://stackoverflow.com/a/847196/7371580
    let renderTime = (unixTimestamp: number) => {
        let unix_timestamp = 1549312452
        var date = new Date(unix_timestamp * 1000);
        var hours = date.getHours();
        var minutes = "0" + date.getMinutes();
        var seconds = "0" + date.getSeconds();
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"]

        return  hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2) + " " + months[date.getMonth()] + " " + date.getDate() + " " + date.getFullYear()
    }

    let [storageProof, setStorageProof] = createSignal(false);

    return (
        <Show when={m()}>
            <h2 class={hs.logo}><a class={hs.logo} href={`/${hex(m().rq.sender)}`}>{hex(m().rq.sender)}</a></h2>
            <div class={styles.messages}>
                <div class={styles.content}>
                    <div>
                        <Message message={m().rq.message}></Message>
                    </div>
                </div>
                <hr/>
                <div class={styles.content}>
                    <div>
                        <p class="secondary">{renderTime(m().metadata.timestamp)}</p>
                        <p class="secondary"><a class="secondary" onclick={() => { setStorageProof(!storageProof())}}>{storageProof() ? "Hide" : "Show"} storage proof</a></p>
                        <Show when={storageProof()}>
                            <br/>
                            <StorageProof message={m()}></StorageProof>
                        </Show>
                    </div>
                </div>
            </div>
        </Show>
    );
};

export default User;
