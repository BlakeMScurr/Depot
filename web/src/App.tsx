import type { Component } from "solid-js";
import { For } from "solid-js";

import User  from "./User"
import Message  from "./Message"
import Button from "./Button"

import styles from "./App.module.css";

const App: Component = () => {
  let messages = [
    {
      from: "0x00000",
      message: "great point @guthl.eth!",
      hash: "1234"
    },
    {
      from: "0x11111",
      message: "gm",
      hash: "5678"
    },
    {
      from: "0x2fdsa3",
      message: "what is this app??? what is www.snuggly.com??",
      hash: "9012"
    }
  ]

  return (
    <div class={styles.container}>
      <h1><a class={styles.logo} href="/">Snuggly</a></h1>
      <Button content="Login with Ethereum"></Button>
      <div class={styles.messages}>
        <For each={messages}>{(message) =>
          <div onclick={() => { window.location.assign("/m/" + message.hash) }} class={styles.content}>
            <div>
              <User address={message.from}></User>
              <Message message={message.message}></Message>
            </div>
            <hr/>
          </div>
        }</For>
      </div>
      <a class={styles.primary} href="https://github.com/blakemscurr/snuggly">github</a>
    </div>
  );
};

export default App;
