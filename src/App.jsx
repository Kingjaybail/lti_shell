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
        <div className="terminalPanel">
          <div className="panelHeader">
            <span className="active">Terminal</span>
          </div>
          <Terminal />
        </div>
        <div className="resultsPanel">
          <div className="panelHeader">
            <span className="active">Results</span>
          </div>
          <div className="resultsBody">
            <Results />
          </div>
        </div>
      </div>
    </div>
  );
}