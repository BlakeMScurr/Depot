import type { Component } from "solid-js";

import { default as styles } from "./Footer.module.css";

const User: Component = () => {
    return (
        <div class={styles.filler}>
            <div class={styles.linkList}>
                <a class="primary" href="https://github.com/blakemscurr/snuggly">github</a>
            </div>
        </div>
    );
};

export default User;
