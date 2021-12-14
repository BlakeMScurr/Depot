import { Component, For, Switch, Match } from "solid-js";

import styles from "./App.module.css";

const Message: Component = (props) => {
    
    return (
        <div class={styles.button}>
            <p class={styles.buttonText}>{props.content}</p>
        </div>
    );
};

export default Message;

