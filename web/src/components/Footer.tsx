import type { Component } from "solid-js";

import { default as styles } from "./Footer.module.css";

const User: Component = () => {
    return (
        // duplicate underneath the footer to prevent stuff getting stuck under the footer
        // TODO: there's probably a nice css way to do this
        <>
            <div>
                <div class={styles.linkList}>
                    <a href="" class={styles.secret}>github</a>
                </div>
            </div>
            <div class={styles.footer}>
                <div class={styles.linkList}>
                    <a class="primary" href="https://github.com/blakemscurr/snuggly">github</a>
                </div>
            </div>
        </>
    );
};

export default User;
