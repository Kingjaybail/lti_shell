import { useEffect, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import Sidebar from "./components/Sidebar/sidebar.jsx"
import Terminal from "./components/Terminal/terminal.jsx"
import Results from "./components/Results/results.jsx"
import ProfessorView from "./Dashboard/ProfessorView/ProfessorView.jsx"
import "./App.css"

function StudentShell({ isProfessor, claims }) {
  return (
    <div className="shell">
      <Sidebar isProfessor={isProfessor} claims={claims} />
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
      const standard = raw.replace(/-/g, '+').replace(/_/g, '/')
      const parsed = JSON.parse(atob(standard))
      setClaims(parsed)
      console.log("From Moodle", parsed)
    } catch (error) {
      console.error("Failed to parse lti_claims", error)
    }
  }, [])

  const isProfessor = true

  return (
    <Routes>
      <Route
        path="/"
        element={
          <StudentShell
            isProfessor={isProfessor}
            claims={claims}
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