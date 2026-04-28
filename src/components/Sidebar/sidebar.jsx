import { useState, useEffect, useRef } from "react"
import "./sidebar.css"

function QuestionDropdown({ questions, activeQuestion, onSelectQuestion, questionResults }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const selected = questions[activeQuestion]
  const selectedPassed = questionResults?.[activeQuestion] === true
  const label = selected
    ? `#${activeQuestion + 1} — ${selected.prompt.length > 15 ? selected.prompt.slice(0, 15) + "…" : selected.prompt}`
    : "No assignments loaded"

  return (
    <div className="customSelect" ref={ref}>
      <div
        className={`customSelectTrigger${open ? " open" : ""}${selectedPassed ? " passed" : ""}`}
        onClick={() => questions.length > 0 && setOpen(o => !o)}
      >
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <ul className="customSelectList">
          {questions.map((q, i) => {
            const passed = questionResults?.[i] === true
            return (
              <li
                key={q.id ?? i}
                className={`customSelectItem${i === activeQuestion ? " active" : ""}${passed ? " passed" : ""}`}
                onClick={() => { onSelectQuestion(i); setOpen(false) }}
              >
                <span>#{i + 1} — {q.prompt.length > 20 ? q.prompt.slice(0, 20) + "…" : q.prompt}</span>
                {passed && <span className="qCheck">✓</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function Sidebar({ isProfessor, claims, assignment, activeQuestion, onSelectQuestion, questionResults, onOpenProfessor }) {
  const resourceLink = claims?.["https://purl.imsglobal.org/spec/lti/claim/resource_link"]
  const context = claims?.["https://purl.imsglobal.org/spec/lti/claim/context"]

  const title = assignment?.title ?? resourceLink?.title ?? "Assignment"
  const course = assignment?.class_name ?? context?.label ?? context?.title ?? "Course"
  const questions = assignment?.questions ?? []
  const selected = questions[activeQuestion] ?? null

  return (
    <aside className="sidebarRoot">
      <header className="sidebarHeader">
        <h2 className="sidebarTitle">{title}</h2>
        <p className="sidebarSub">{course}</p>
        {assignment && (
          <div className="sidebarMeta">
            {assignment.student_id && <span>Student: {assignment.student_id}</span>}
            {assignment.professor_id && <span>Professor: {assignment.professor_id}</span>}
          </div>
        )}

        <div className="dropdownSection">
          <p className="sectionLabel">Question</p>
          <QuestionDropdown
            questions={questions}
            activeQuestion={activeQuestion}
            onSelectQuestion={onSelectQuestion}
            questionResults={questionResults}
          />
        </div>
      </header>

      <div className="sidebarBody">
        {selected && (
          <>
            <p className="sectionLabel">Assignment Info</p>
            <p className="questionPromptFull">{selected.prompt}</p>
            <p className="testCaseCount">
              {selected.test_cases.length} test case{selected.test_cases.length !== 1 ? "s" : ""}
            </p>
          </>
        )}
        {!selected && <p className="emptyState">No questions loaded.</p>}
      </div>

      <footer className="sidebarFooter">
        {isProfessor && (
          <button onClick={onOpenProfessor}>Professor View</button>
        )}
      </footer>
    </aside>
  )
}
