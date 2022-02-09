import { ethers } from "ethers";
import { Component, For, Switch, Match } from "solid-js";
import { splitByLink, addHttp, feltToString } from "../util";

const Message: Component = (props) => {
    let message = feltToString(props.message.map((str: string) => ethers.BigNumber.from(str)))
    let parts = splitByLink(message)

    return (
        <For each={parts}>{(part) =>
            <Switch fallback={<span class="primary">{part.text}</span>}>
                <Match when={part.type == "link"}>
                    <a class="primary" href={addHttp(part.text)}>{part.text}</a>
                </Match>
                <Match when={part.type == "user"}>
                    <a class="primary" href={part.text}>{part.text}</a>
                </Match>
            </Switch>
        }</For>
    );
};

export default Message;

