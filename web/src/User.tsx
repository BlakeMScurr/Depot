import type { Component } from "solid-js";

import styles from "./App.module.css";

const User: Component = (props) => {
    return (
        <p><a class={styles.secondary} href={props.address}>{props.address}</a></p>
    );
};

export default User;
