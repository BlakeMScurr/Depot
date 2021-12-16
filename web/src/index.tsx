import { render } from "solid-js/web";
import { Router, Routes, Route, Link } from "solid-app-router";

import "./index.css";
import Home from "./Home";
import { Component } from "solid-js";
import Header from "./components/Header"
import Footer from "./components/Footer"

import styles from "./Index.module.css"

const App: Component = () => {
    return (
        <div class={styles.container}>
            <Header></Header>
                <Routes>
                    <Route path="/" element={
                        <Home></Home>
                    }></Route>
                    <Route path="/:user" element={"user lol"}></Route>
                    <Route path="/m/:message" element={"message lol"}></Route>
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
