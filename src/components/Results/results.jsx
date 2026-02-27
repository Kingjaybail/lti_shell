// this is where user input results will appear according to test cases

import "./results.css";

export default function Results() {
  return (
    <section className="resultsRoot">
      <header className="resultsHeader">
        <h2 className="resultsTitle">Results</h2>
      </header>

      <div className="resultsBody">
        {/* TODO: test results / stdout / stderr / grade summary */}
      </div>
    </section>
  );
}