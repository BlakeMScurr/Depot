import type { Component } from "solid-js";

import styles from "./App.module.css";

const User: Component = (props) => {
    return (
        <p class={styles.secondary}>{props.address}</p>
    );
};

export default User;
