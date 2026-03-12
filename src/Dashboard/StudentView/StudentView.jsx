import Sidebar from "../../components/Sidebar/sidebar";
import Terminal from "../../components/Terminal/terminal";
import Results from "../../components/Results/results";
import "./studentview.css";

export default function StudentView() {
  return (
    <div className="studentRoot">

      <header className="studentHeader">
        <h1>Linux Assignment Lab</h1>

        <div className="studentActions">
          <button className="runBtn">Run Tests</button>
          <button className="submitBtn">Submit</button>
        </div>
      </header>

      <div className="studentWorkspace">
        <Sidebar />

        <div className="terminalPanel">
          <Terminal />
        </div>
      </div>

      <Results />

    </div>
  );
}