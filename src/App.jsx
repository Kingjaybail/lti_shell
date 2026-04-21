import { Routes, Route, Navigate } from "react-router-dom"
import { useState, useEffect } from "react"
import Sidebar from "./components/Sidebar/sidebar.jsx"
import Terminal from "./components/Terminal/terminal.jsx"
import Results from "./components/Results/results.jsx"
import ProfessorView from "./Dashboard/ProfessorView/ProfessorView.jsx"
import "./App.css"

function StudentShell({ isProfessor, claims, assignment }) {
  const [activeQuestion, setActiveQuestion] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [questionResults, setQuestionResults] = useState({})

  const questions = assignment?.questions ?? []
  const currentQuestion = questions[activeQuestion] ?? null

  const passedCount = Object.values(questionResults).filter(Boolean).length
  const grade = questions.length > 0 ? Math.round((passedCount / questions.length) * 100) : 0

  function handleQuestionResult(index, passed) {
    setQuestionResults(prev => ({ ...prev, [index]: passed }))
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

function ProfessorRoute({ isProfessor, children }) {
  if (!isProfessor) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [claims, setClaims] = useState(null)
  const [assignment, setAssignment] = useState(null)
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

  const isProfessor = true

  return (
    <Routes>
      <Route
        path="/"
        element={<StudentShell isProfessor={isProfessor} claims={claims} assignment={assignment} />}
      />
      <Route
        path="/professor"
        element={
          <ProfessorRoute isProfessor={isProfessor}>
            <ProfessorView
              assignment={assignment}
              claims={claims}
              apiUrl={apiUrl}
              onAssignmentUpdate={setAssignment}
            />
          </ProfessorRoute>
        }
      />
    </Routes>
  )
}
