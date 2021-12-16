import { createStore, Store } from "solid-js/store";

let [get, set] = createStore({messages: [
    { from: "0x00000", message: "how are we all going?", hash: "0", new: false },
    { from: "0x00000", message: "testing bla bla bla", hash: "1", new: false },
    { from: "0x00000", message: "yo yo yo wassup", hash: "2", new: false },
    { from: "0x00000", message: "yeah that's true", hash: "3", new: false },
    { from: "0x00000", message: "great point @guthl.eth!", hash: "4", new: false },
    { from: "0x00000", message: "great point @guthl.eth!", hash: "5", new: false },
    { from: "0x11111", message: "gm", hash: "5678", new: false },
    { from: "0x2fdsa3", message: "what is this app??? what is www.snuggly.com??", hash: "9012", new: false }
]})

export type message = {from: string, message: string, hash: string, new: boolean}

export function messageStore() {
    return [get, set]
}