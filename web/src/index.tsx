import { render } from "solid-js/web";
import { Router, Routes, Route } from "solid-app-router";
import { Component } from "solid-js";

import "./index.css";
import styles from "./Index.module.css"

import Home from "./pages/Home";
import User from "./pages/User"
import Message from "./pages/Message"
import StorageProof from "./pages/StorageProof"

import Header from "./components/Header"
import Footer from "./components/Footer"


const App: Component = () => {
    return (
        <div class={styles.container}>
            <Header></Header>
                <Routes>
                    <Route path="/" element={
                        <Home></Home>
                    }></Route>
                    <Route path="/:user" element={<User></User>}></Route>
                    <Route path="/m/:hash" element={<Message></Message>}></Route>
                    <Route path="/storageProof/:hash" element={<StorageProof></StorageProof>}></Route>
                </Routes>
            <Footer></Footer>
        </div>
    )
}

render(() => 
    <Router>
        <App />
    </Router>
, document.getElementById("root") as HTMLElement);
