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
    },
    {
      from: "0x11111",
      message: "gm",
    },
    {
      from: "0x2fdsa3",
      message: "what is this app??? what is www.snuggly.com??",
    }
  ]

  return (
    <div class={styles.container}>
      <h1>Snuggly</h1>
      <Button content="Login with Ethereum"></Button>
      <For each={messages}>{(message) =>
        <div>
          <User address={message.from}></User>
          <Message message={message.message}></Message>
          <hr/>
        </div>
      }</For>
      <a class={styles.primary} href="https://github.com/blakemscurr/snuggly">github</a>
    </div>
  );
};

export default App;
