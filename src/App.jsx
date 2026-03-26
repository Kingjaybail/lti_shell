import { useEffect } from "react";
import Sidebar from "./components/Sidebar/sidebar.jsx";
import Terminal from "./components/Terminal/terminal.jsx";
import Results from "./components/Results/results.jsx";
import "./App.css";

export default function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("lti_claims");
    if (raw) {
      const claims = JSON.parse(atob(raw));
      console.log("=== LTI Claims from Moodle ===", claims);
    }
  }, []);

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