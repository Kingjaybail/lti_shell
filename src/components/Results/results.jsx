import { useState } from "react";
import "./results.css";

const MOCK_TESTS = [
  { id: 1, name: "Test Case 1", input: "ls /workspace", expected: "file.txt" },
  { id: 2, name: "Test Case 2", input: "echo hello", expected: "hello" },
  { id: 3, name: "Test Case 3", input: "pwd", expected: "/workspace" },
];

export default function Results() {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    setResults([]);

    for (const test of MOCK_TESTS) {
      await new Promise(r => setTimeout(r, 600)); 
      const passed = Math.random() > 0.3;         
      setResults(prev => [...prev, { ...test, passed }]);
    }

    setRunning(false);
  };

  const allPassed = results.length === MOCK_TESTS.length && results.every(r => r.passed);
  const anyFailed = results.some(r => !r.passed);

  return (
    <section className="resultsRoot">
      <header className="resultsHeader">
        <span className="resultsTitle">Test Results</span>
        <button className="submitBtn" onClick={runTests} disabled={running}>
          {running ? "Running..." : "Submit"}
        </button>
      </header>

      <div className="resultsBody">
        {results.length === 0 && !running && (
          <p className="placeholder">Press Submit to run test cases.</p>
        )}

        {results.map(r => (
          <div key={r.id} className={`testCase ${r.passed ? "pass" : "fail"}`}>
            <span className="testIndicator">{r.passed ? "✓" : "✗"}</span>
            <span className="testName">{r.name}</span>
            <span className="testStatus">{r.passed ? "Passed" : "Wrong Answer"}</span>
          </div>
        ))}

        {results.length === MOCK_TESTS.length && (
          <div className={`summary ${allPassed ? "pass" : "fail"}`}>
            {allPassed ? "All test cases passed!" : `${results.filter(r => !r.passed).length} test(s) failed.`}
          </div>
        )}
      </div>
    </section>
  );
}