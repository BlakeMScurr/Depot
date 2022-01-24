import type { Component } from "solid-js";

import styles from "./User.module.css"

const User: Component = (props) => {
    return (
        // TODO: look up ENS name
        <p class={styles.user}><a class="secondary" href={"/" + props.address}>{props.address}</a></p>
    );
};

export default User;
