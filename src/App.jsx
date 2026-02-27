import { useState } from "react";
import Sidebar from "./components/Sidebar/sidebar.jsx";
import Terminal from "./components/Terminal/terminal.jsx";
import Results from "./components/Results/results.jsx";
import "./app.css";
import Sample from "./sample.jsx";

export default function App() {

  return (
    <div className="shell">
      <Sample  />
      <Sidebar />

      <div className="right">
        <Terminal />
        <Results /> 
      </div>
    </div>
  );
}
