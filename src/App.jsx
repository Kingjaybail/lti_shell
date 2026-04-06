import { useEffect, useMemo, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import Sidebar from "./components/Sidebar/sidebar.jsx"
import Terminal from "./components/Terminal/terminal.jsx"
import Results from "./components/Results/results.jsx"
import ProfessorView from "./Dashboard/ProfessorView/ProfessorView.jsx"
import "./App.css"

function StudentShell({ isProfessor }) {
  return (
    <div className="shell">
      <Sidebar isProfessor={isProfessor} />
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
  
  const isProfessor = true
/*  const isProfessor = useMemo(() => {
    if (!claims) return false

    const roles =
      claims[
        "https://purl.imsglobal.org/spec/lti/claim/roles"
      ] || claims.roles || []

    return roles.some(role =>
      role.includes("Instructor") ||
      role.includes("Teacher") ||
      role.includes("Administrator")
    )
  }, [claims])*/

  return (
    <Routes>
      <Route path="/" element={<StudentShell isProfessor={isProfessor} />} />
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