import { Component, createSignal } from "solid-js";
import { splitByLink } from "../util";
import Button from "./Button";
import { default as styles } from "./Composer.module.css";

const User: Component = () => {
    // TODO: colour links as they're written
    // Options include:
    // - having a renderer div overlaid ontop of the input div (ends up being tricky to use the innerHTML or innerText of the input to produce the appropriate results)
    // - updating the inner html and replacing the caret appropriately

    let input;
    let [renderer, setRenderer] = createSignal(null)
    // render links
    let oninput = () => {
        let parent = document.createElement('div');
        input.childNodes.forEach((node) => {
            parent.appendChild(node.cloneNode(true))
        })

        let parts = splitByLink(parent.innerText)
        parts.forEach((part) => {
            if (part.type !== "text") {
                parent.innerHTML = parent.innerHTML.replace(part.text, `<span>${part.text}</span>`)

            }
        })

        setRenderer(parent)
    }

    return (
        <div class={styles.container}>
            <div ref={input} oninput={oninput} class={styles.input} placeholder="gm" contenteditable="true"></div>
            <div class={styles.renderer}>
                {renderer}
            </div>
            <div class={styles.button}>
                <Button content="poast"></Button>
            </div>
        </div>
    );
};

export default User;
