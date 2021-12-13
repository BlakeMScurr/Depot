import type { Component } from "solid-js";
import { For } from "solid-js";

import User  from "./User"
import Message  from "./Message"

import styles from "./App.module.css";

const App: Component = () => {
  let messages = [
    {
      from: "0x00000",
      message: "great point @guthl.eth",
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
    <div class={styles.bg}>
      <h1>Snuggly</h1>
      <button>Login with Ethereum</button>
      <For each={messages}>{(message) =>
        <>
          <User address={message.from}></User>
          <Message message={message.message}></Message>
          <hr/>
        </>
      }</For>
      <a href="github.com/blakemscurr/snuggly">github</a>
    </div>
  );
};

export default App;
