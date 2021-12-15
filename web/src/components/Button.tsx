import { Component, createEffect, mergeProps } from "solid-js";

import styles from "./Button.module.css";

const Message: Component = (props) => {
    props = mergeProps({active: true}, props)

    return (
        <div class={ props.active() ? styles.button: styles.inactive } onclick={() => {props.clickSignal(true)}}>
            <p class={styles.buttonText}>{props.content}</p>
        </div>
    );
};

export default Message;

