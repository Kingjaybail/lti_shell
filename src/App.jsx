import { useState } from "react";
import Sidebar from "./components/Sidebar/sidebar.jsx";
import Terminal from "./components/Terminal/terminal.jsx";
import Results from "./components/Results/results.jsx";
import "./App.css";

export default function App() {

  return (
    <div className="shell">
      <Sidebar />

      <div className="right">
        <Terminal className="terminal"/>
        <Results /> 
      </div>
    </div>
  );
}
