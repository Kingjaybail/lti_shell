import { useState, useEffect } from "react";
import "./results.css";

export default function Results({ question, questionIndex, sessionId, onQuestionResult }) {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const testCases = question?.test_cases ?? [];

  useEffect(() => {
    setResults([]);
    setError(null);
  }, [question]);

  const runTests = async () => {
    if (!sessionId) {
      setError("No active terminal session. Open the terminal first.");
      return;
    }

    setRunning(true);
    setResults([]);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, test_cases: testCases }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();
      const mapped = data.results.map((r, i) => ({
        id: i,
        name: `Test Case ${i + 1}`,
        passed: r.passed,
        actual: r.actual,
        expected: r.expected,
      }));

      setResults(mapped);
      const allPassed = mapped.length === testCases.length && mapped.every(r => r.passed);
      onQuestionResult?.(questionIndex, allPassed);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const allPassed = results.length > 0 && results.length === testCases.length && results.every(r => r.passed);

  return (
    <section className="resultsRoot">
      <header className="resultsHeader">
        <span className="resultsTitle">Test Results</span>
        <button
          className="submitBtn"
          onClick={runTests}
          disabled={running || testCases.length === 0}
        >
          {running ? "Running..." : "Submit"}
        </button>
      </header>

      <div className="resultsBody">
        {error && <p className="placeholder" style={{ color: "#ef4743" }}>{error}</p>}

        {!error && results.length === 0 && !running && (
          <p className="placeholder">
            {testCases.length === 0 ? "Select an assignment to begin." : "Press Submit to run test cases."}
          </p>
        )}

        {results.map(r => (
          <div key={r.id} className={`testCase ${r.passed ? "pass" : "fail"}`}>
            <span className="testIndicator">{r.passed ? "✓" : "✗"}</span>
            <span className="testName">{r.name}</span>
            <span className="testStatus">{r.passed ? "Passed" : `Got: ${r.actual || "no output"}`}</span>
          </div>
        ))}

        {results.length === testCases.length && testCases.length > 0 && (
          <div className={`summary ${allPassed ? "pass" : "fail"}`}>
            {allPassed
              ? "All test cases passed!"
              : `${results.filter(r => !r.passed).length} test(s) failed.`}
          </div>
        )}
      </div>
    </section>
  );
}
