import type { Component } from "solid-js";

import styles from "./Header.module.css";

const User: Component = () => {
    return (
        <h1><a class={styles.logo} href="/">Snuggly</a></h1>
    );
};

export default User;
