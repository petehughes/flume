import { Exmaple1 } from "./example1"
import { Example2 } from "./example2"

import "./index.module.css";
import style from  "./index.module.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, NavLink, Route, Routes } from "react-router";

const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(
	<BrowserRouter>
	  {/* Navigation */}
	  <nav>
		<NavLink to="/" className={({isActive})=>{isActive? style.active: ""}} >Home</NavLink> |{" "}
		<NavLink to="/example1" className={({isActive})=>{isActive? style.active: ""}}>Example 1</NavLink> |{" "}
		<NavLink to="/example2" className={({isActive})=>{isActive? style.active: ""}}>Example 2</NavLink>
	  </nav>
	  {/* Routes */}
	  <Routes>
		<Route path="/" element={<Home />} />
		<Route path="/example1" element={<Exmaple1 />} />
		<Route path="/example2" element={<Example2 />} />
	  </Routes>
	</BrowserRouter>
);


function Home() {
  return <h1>Home Page</h1>;
}