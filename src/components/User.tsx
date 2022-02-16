import { ethers } from "ethers";
import type { Component } from "solid-js";
import { hex } from "../util";

import styles from "./User.module.css"

const User: Component = (props) => {
    let h = hex(props.address)
    return (
        // TODO: look up ENS name
        <p class={styles.user}><a class="secondary" href={"/" + h}>{h}</a></p>
    );
};

export default User;
