import { Component, createEffect, mergeProps } from "solid-js";

import styles from "./Button.module.css";

const Message: Component = (props) => {
    props = mergeProps({active: true}, props)

    const handleClick = () => {
        props.clickSignal(true)
    }

    const handleKeypress = (key) => {
        if (key.keyCode === 13) {
            props.clickSignal(true)
        }
    }

    return (
        <div class={ props.active() ? styles.button: styles.inactive } onclick={handleClick} onkeypress={handleKeypress} tabindex={props.active() ? "0" : ""}>
            <p class={styles.buttonText}>{props.content}</p>
        </div>
    );
};

export default Message;

