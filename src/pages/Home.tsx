import { Component, createEffect, createResource, createSignal } from "solid-js";
import { For, Show } from "solid-js";


import User  from "../components/User"
import Message  from "../components/Message"
import Button from "../components/Button"
import Composer from "../components/Composer"

import styles from "./Home.module.css";
import { request, setMessage, fetchMessages } from "../store";
import { hex } from "../util";

const App: Component = () => {
  let [loggedIn, login] = createSignal(true)
  let [post, setPost] = createSignal("")
  let [store] = createResource(fetchMessages, {initialValue: []})

  createEffect(() => {
    if (post()) { // TODO: make sure we don't send the post signal as the signal is initialised
      // TODO: animate on create
      setMessage({rq: { "type": "0", "blocknumber": "1", "app": "0", "sender": "0xYOU", "message": post(), "signature": "123", }, "metadata": { "hash": store().length + "", "block": 0, "root": 0, "branches": [{"left": true, "value": 0}, {"left": false, "value": 1}]}},)
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
        <For each={store()}>{(message: request) =>
          <div onclick={() => { window.location.assign("/m/" + hex(message.metadata.hash)) }} class={styles.content}>
            <div>
              <User address={message.rq.sender}></User>
              <Message message={message.rq.message}></Message>
            </div>
            <hr/>
          </div>
        }</For>
      </div>
    </>
  );
};

export default App;
