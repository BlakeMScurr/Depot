import { Component, createEffect, createSignal } from "solid-js";
import { For, Show } from "solid-js";


import User  from "../components/User"
import Message  from "../components/Message"
import Button from "../components/Button"
import Composer from "../components/Composer"

import styles from "./Home.module.css";
import { message, messageStore } from "../store";

const App: Component = () => {
  let [loggedIn, login] = createSignal(true)
  let [post, setPost] = createSignal("")
  let [store, setStore ] = messageStore()

  createEffect(() => {
    if (post()) { // TODO: make sure we don't send the post signal as the signal is initialised
      // TODO: animate on create
      setStore("messages", (messages: Array<message>) => [{content: {from: "you", message: post(), signature: "somesig"}, metadata: {hash: Math.floor(Math.random() * 1000) + ""}}, ...messages])
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
        <For each={store.messages}>{(message: message) =>
          <div onclick={() => { window.location.assign("/m/" + message.metadata.hash) }} class={styles.content}>
            <div>
              <User address={message.content.from}></User>
              <Message message={message.content.message}></Message>
            </div>
            <hr/>
          </div>
        }</For>
      </div>
    </>
  );
};

export default App;
