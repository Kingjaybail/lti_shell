import { useState, useEffect } from "react"
import Sidebar from "./components/Sidebar/sidebar.jsx"
import Terminal from "./components/Terminal/terminal.jsx"
import Results from "./components/Results/results.jsx"
import ProfessorView from "./Dashboard/ProfessorView/ProfessorView.jsx"
import "./App.css"

function StudentShell({ isProfessor, claims, assignment, onOpenProfessor }) {
  const [activeQuestion, setActiveQuestion] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [questionResults, setQuestionResults] = useState({})
  const [gradeStatus, setGradeStatus] = useState(null)
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

  const questions = assignment?.questions ?? []
  const currentQuestion = questions[activeQuestion] ?? null

  const passedCount = Object.values(questionResults).filter(Boolean).length
  const grade = questions.length > 0 ? Math.round((passedCount / questions.length) * 100) : 0

  useEffect(() => {
    if (!sessionId || !questions.length) return
    fetch(`${apiUrl}/api/session/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, question_count: questions.length }),
    }).catch(() => {})
  }, [sessionId, questions.length])

  async function submitGrade() {
    const lineitem = claims?.["https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"]?.lineitem
    const userId = claims?.sub
    if (!lineitem || !userId) return
    setGradeStatus("submitting")
    try {
      const res = await fetch(`${apiUrl}/api/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineitem_url: lineitem, user_id: userId, score: grade }),
      })
      const data = await res.json()
      setGradeStatus(data.ok ? "submitted" : "error")
    } catch {
      setGradeStatus("error")
    }
  }

  function handleQuestionResult(index, passed) {
    setQuestionResults(prev => ({ ...prev, [index]: passed }))
    setGradeStatus(null)
  }

  return (
    <div className="shell">
      <Sidebar
        isProfessor={isProfessor}
        claims={claims}
        assignment={assignment}
        activeQuestion={activeQuestion}
        onSelectQuestion={setActiveQuestion}
        questionResults={questionResults}
        onOpenProfessor={onOpenProfessor}
      />
      <div className="right">
        <div className="terminalPanel">
          <div className="panelHeader">
            <span className="active">Terminal</span>
          </div>
          <Terminal onSession={setSessionId} />
        </div>

        <div className="resultsPanel">
          <div className="panelHeader">
            <span className="active">Results</span>
            {questions.length > 0 && (
              <span className="gradeChip">
                {passedCount}/{questions.length} &mdash; {grade}%
              </span>
            )}
            {claims?.["https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"]?.lineitem && (
              <button
                className="submitGradeBtn"
                onClick={submitGrade}
                disabled={gradeStatus === "submitting"}
              >
                {gradeStatus === "submitting" ? "Submitting…" : gradeStatus === "submitted" ? "Submitted ✓" : gradeStatus === "error" ? "Error — Retry" : "Submit"}
              </button>
            )}
          </div>
          <div className="resultsBody">
            <Results
              question={currentQuestion}
              questionIndex={activeQuestion}
              sessionId={sessionId}
              onQuestionResult={handleQuestionResult}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [claims, setClaims] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [showProfessor, setShowProfessor] = useState(false)
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get("lti_claims")
    if (!raw) return
    try {
      const standard = raw.replace(/-/g, "+").replace(/_/g, "/")
      const parsed = JSON.parse(atob(standard))
      setClaims(parsed)
      console.log("From Moodle:", parsed)
    } catch (err) {
      console.error("Failed to parse lti_claims", err)
    }
  }, [])

  useEffect(() => {
    const resourceLink = claims?.["https://purl.imsglobal.org/spec/lti/claim/resource_link"]
    const context = claims?.["https://purl.imsglobal.org/spec/lti/claim/context"]

    const assignmentId = resourceLink?.id
    const courseId = context?.id

    if (!assignmentId || !courseId) {
      fetch(`${apiUrl}/api/assignment/dev`)
        .then(r => r.json())
        .then(setAssignment)
        .catch(err => console.error("Failed to load dev assignment", err))
      return
    }

    fetch(`${apiUrl}/api/assignment/current?assignment_id=${assignmentId}&course_id=${courseId}`)
      .then(async r => {
        if (r.status === 404) {
          return {
            moodle_resource_id: assignmentId,
            moodle_course_id: courseId,
            title: resourceLink?.title ?? "Assignment",
            class_name: context?.label ?? context?.title ?? "Course",
            questions: [],
          }
        }
        return r.json()
      })
      .then(setAssignment)
      .catch(err => console.error("Failed to load assignment", err))
  }, [claims])

  const roles = claims?.["https://purl.imsglobal.org/spec/lti/claim/roles"] ?? []
  const isProfessor = roles.length === 0
    || roles.some(r => r.includes("Instructor") || r.includes("Administrator"))

  return (
    <>
      <StudentShell
        isProfessor={isProfessor}
        claims={claims}
        assignment={assignment}
        onOpenProfessor={() => setShowProfessor(true)}
      />
      {showProfessor && isProfessor && (
        <div className="professorOverlay">
          <ProfessorView
            assignment={assignment}
            claims={claims}
            apiUrl={apiUrl}
            onAssignmentUpdate={setAssignment}
            onClose={() => setShowProfessor(false)}
          />
        </div>
      )}
    </>
  )
}
