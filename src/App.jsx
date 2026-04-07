import { useEffect, useMemo, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import Sidebar from "./components/Sidebar/sidebar.jsx"
import Terminal from "./components/Terminal/terminal.jsx"
import Results from "./components/Results/results.jsx"
import ProfessorView from "./Dashboard/ProfessorView/ProfessorView.jsx"
import "./App.css"

function StudentShell({ isProfessor, assignment }) {
  return (
    <div className="shell">
      <Sidebar isProfessor={isProfessor} assignment={assignment} />
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
  )
}

function ProfessorRoute({ isProfessor, children }) {
  if (!isProfessor) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  const [claims, setClaims] = useState(null)
  const [assignment, setAssignment] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get("lti_claims")

    if (!raw) return

    try {
      const parsed = JSON.parse(atob(raw))
      setClaims(parsed)
      console.log("From Moodle", parsed)
    } catch (error) {
      console.error("Failed to parse lti_claims", error)
    }
  }, [])
useEffect(() => {
  fetch("http://127.0.0.1:8000/api/assignment/current", {
    method: "GET",
    credentials: "include"
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Failed to load assignment: ${res.status}`)
      }
      return res.json()
    })
    .then(data => {
      console.log("Assignment from backend:", data)
      setAssignment(data)
    })
    .catch(error => {
      console.error("Assignment fetch failed", error)
    })
}, [])

  /*useEffect(() => {
    fetch("/api/assignment/current", {
      method: "GET",
      credentials: "include"
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load assignment: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        console.log("Assignment from backend:", data)
        setAssignment(data)
      })
      .catch(error => {
        console.error("Assignment fetch failed", error)
      })
  }, [])*/
    const isProfessor = true
  /*const isProfessor = useMemo(() => {
    if (!claims) return false

    const roles =
      claims["https://purl.imsglobal.org/spec/lti/claim/roles"] ||
      claims.roles ||
      []

    return roles.some(role =>
      role.includes("Instructor") ||
      role.includes("Teacher") ||
      role.includes("Administrator")
    )
  }, [claims])*/
  console.log("Current assignment state:", assignment)

  return (
    <Routes>
      <Route
        path="/"
        element={
          <StudentShell
            isProfessor={isProfessor}
            assignment={assignment}
          />
        }
      />
      <Route
        path="/professor"
        element={
          <ProfessorRoute isProfessor={isProfessor}>
            <ProfessorView />
          </ProfessorRoute>
        }
      />
    </Routes>
  )
}