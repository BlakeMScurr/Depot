import { createStore } from "solid-js/store";

function addMetadata(x: Array<any>) {
    x.forEach((m: message) => {
        m.metadata = { timestamp: 1549312452, hash: 12341234 }
    });
    return x
}

let [get, set] = createStore({messages: addMetadata([
    { from: "0x00000", message: "how are we all going?", hash: "0", },
    { from: "0x00000", message: "testing bla bla bla", hash: "1" },
    { from: "0x00000", message: "yo yo yo wassup", hash: "2" },
    { from: "0x00000", message: "yeah that's true", hash: "3" },
    { from: "0x00000", message: "great point @guthl.eth!", hash: "4" },
    { from: "0x00000", message: "great point @guthl.eth!", hash: "5" },
    { from: "0x11111", message: "gm", hash: "5678" },
    { from: "0x2fdsa3", message: "what is this app??? what is www.snuggly.com??", hash: "9012" }
])})

export type message = {from: string, message: string, hash: string, metadata: { timestamp: number, hash: number } }

export function messageStore() {
    return [get, set]
}