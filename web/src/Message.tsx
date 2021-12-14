import { Component, For, Switch, Match } from "solid-js";

import styles from "./App.module.css";
import { splitByLink, addHttp } from "./util";

const Message: Component = (props) => {
    
    let parts = splitByLink(props.message)

    return (
        <For each={parts}>{(part) =>
            <Switch fallback={<span class={styles.primary}>{part.text}</span>}>
                <Match when={part.type == "link"}>
                    <a class={styles.primary} href={addHttp(part.text)}>{part.text}</a>
                </Match>
                <Match when={part.type == "user"}>
                    <a class={styles.primary} href={part.text}>{part.text}</a>
                </Match>
            </Switch>
        }</For>
    );
};

export default Message;

