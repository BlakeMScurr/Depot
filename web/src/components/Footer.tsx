import type { Component } from "solid-js";

import { default as compStyles } from "./Footer.module.css";

const User: Component = () => {
    return (
        <div class={compStyles.filler}>
            <div class={compStyles.linkList}>
                <a class="primary" href="https://github.com/blakemscurr/snuggly">github</a>
            </div>
        </div>
    );
};

export default User;
