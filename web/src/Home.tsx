import { Component, createEffect, createSignal } from "solid-js";
import { For, Show } from "solid-js";
import { createStore } from "solid-js/store";

import User  from "./components/User"
import Message  from "./components/Message"
import Button from "./components/Button"
import Header from "./components/Header"
import Footer from "./components/Footer"
import Composer from "./components/Composer"

import styles from "./Home.module.css";

const App: Component = () => {
  let [store, setStore] = createStore({messages: [
    {
      from: "0x00000",
      message: "great point @guthl.eth!",
      hash: "1234",
      new: false,
    },
    {
      from: "0x11111",
      message: "gm",
      hash: "5678",
      new: false,
    },
    {
      from: "0x2fdsa3",
      message: "what is this app??? what is www.snuggly.com??",
      hash: "9012",
      new: false,
    }
  ]})

  let [loggedIn, login] = createSignal(true)
  let [post, setPost] = createSignal("")

  createEffect(() => {
    if (post()) { // TODO: make sure we don't send the post signal as the signal is initialised
      // TODO: animate on create
      setStore("messages", (messages) => [{from: "you", message: post(), hash: "somehash", new: true}, ...messages])
    }
  })

  return (
    <>
      <Show when={loggedIn()} fallback={() => 
        <div class={styles.login}>
          <Button clickSignal={login} content="Login with Ethereum"></Button>
        </div>
      }>
        <Composer setPost={setPost}></Composer>
      </Show>
      <div class={styles.messages}>
        <For each={store.messages}>{(message) =>
          <div onclick={() => { window.location.assign("/m/" + message.hash) }} class={styles.content}>
            <div>
              <User address={message.from}></User>
              <Message message={message.message}></Message>
            </div>
            <hr/>
          </div>
        }</For>
      </div>
    </>
  );
};

export default App;
