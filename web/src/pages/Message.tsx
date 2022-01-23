import { useParams } from "solid-app-router";
import { Component, For } from "solid-js";

import hs from "../components/Header.module.css"
import Message from "../components/Message";
import { request, messageStore } from "../store";
import styles from "./Message.module.css"

const User: Component = () => {
    const params = useParams();
    let [store, _] = messageStore()

    let m = store.messages.filter((m: request) =>  m.metadata.hash === params.hash)[0]

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

    return (
        <>
            <h2 class={hs.logo}><a class={hs.logo} href={`/${m.content.from}`}>{m.content.from}</a></h2>
            <div class={styles.messages}>
                <div class={styles.content}>
                    <div>
                        <Message message={m.content.message}></Message>
                    </div>
                </div>
                <hr/>
                <div class={styles.content}>
                    <div>
                        <p class="secondary">{renderTime(m.metadata.timestamp)}</p>
                        <p class="secondary"><a class="secondary" href={`/storageProof/${m.metadata.hash}`}>Storage Proof</a></p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default User;
