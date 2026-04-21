import "./sidebar.css"
import { useNavigate } from "react-router-dom"

export default function Sidebar({ isProfessor, claims, assignment, activeQuestion, onSelectQuestion }) {
  const navigate = useNavigate()

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
          <select
            className="questionDropdown"
            value={activeQuestion ?? ""}
            onChange={e => onSelectQuestion(Number(e.target.value))}
            disabled={questions.length === 0}
          >
            {questions.length === 0
              ? <option>No assignments loaded</option>
              : questions.map((q, i) => (
                  <option key={q.id} value={i}>
                    #{i + 1} — {q.prompt.length > 15 ? q.prompt.slice(0, 15) + "…" : q.prompt}
                  </option>
                ))
            }
          </select>
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
        {!selected && <p className="emptyState">No assignment selected.</p>}
      </div>

      <footer className="sidebarFooter">
        {isProfessor && (
          <button onClick={() => navigate("/professor")}>Professor View</button>
        )}
      </footer>
    </aside>
  )
}
