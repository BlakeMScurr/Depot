import { createStore } from "solid-js/store";
import { stringToFelt } from "./util";

let [get, set] = createStore(
    {
        messages: [
            {content: { from: "0x00000", message: stringToFelt("how are we all going?"), signature: "123", }, metadata: { hash: "0", block: 0, root: 0, branches: [{left: true, value: 0}, {left: false, value: 1}]} },
            {content: { from: "0x00000", message: stringToFelt("testing bla bla bla"), signature: "124" }, metadata: { hash: "1", block: 0, root: 0, branches: [{left: true, value: 0}, {left: false, value: 1}]} },
            {content: { from: "0x00000", message: stringToFelt("yo yo yo wassup"), signature: "125" }, metadata: { hash: "2", block: 0, root: 0, branches: [{left: true, value: 0}, {left: false, value: 1}]} },
            {content: { from: "0x00000", message: stringToFelt("yeah that's true"), signature: "126" }, metadata: { hash: "3", block: 0, root: 0, branches: [{left: true, value: 0}, {left: false, value: 1}]} },
            {content: { from: "0x00000", message: stringToFelt("great point @guthl.eth!"), signature: "127" }, metadata: { hash: "4", block: 0, root: 0, branches: [{left: true, value: 0}, {left: false, value: 1}]} },
            {content: { from: "0x00000", message: stringToFelt("great point @guthl.eth!"), signature: "128" }, metadata: { hash: "5", block: 0, root: 0, branches: [{left: true, value: 0}, {left: false, value: 1}]} },
            {content: { from: "0x11111", message: stringToFelt("gm"), signature: "129" }, metadata: { hash: "6", block: 0, root: 0, branches: [{left: true, value: 0}, {left: false, value: 1}]} },
            {content: { from: "0x2fsa3", message: stringToFelt("what is this app??? what is www.snuggly.com??"), signature: "130"}, metadata: { hash: "7", block: 0, root: 0, branches: [{left: true, value: 0}, {left: false, value: 1}]}}
        ],
    }
)

export type message = {
    content: { from: string, message: string, signature: string }, 
    metadata: { hash: string, block: number, root: number, branches: Array<{left: boolean, value: number}> }
}

export function messageStore() {
    return [get, set]
}