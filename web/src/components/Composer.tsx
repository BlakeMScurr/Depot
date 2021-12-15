import type { Component } from "solid-js";
import { splitByLink } from "../util";

import { default as styles } from "./Composer.module.css";

const User: Component = () => {
    let t;

    let oninput = () => {
        // Auto resize as per https://stackoverflow.com/a/48460773/7371580
        t.style.height = "0px"
        let sh = (t.scrollHeight - 20) + "px" // -20 removes the padding
        t.height = sh
        t.style.height = sh

        // highlight links
        _ = splitByLink(t.value).map((part) => {
            return part.type === "text" ? part.text : `<mark>${part.text}</mark>`
        }).join("")
    }

    return (
        <div class={styles.container}>
            <textarea ref={t} oninput={oninput} class={styles.input} placeholder="gm" />
        </div>
    );
};

export default User;
