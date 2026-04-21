import { Routes, Route, Navigate } from "react-router-dom"
import Sidebar from "./components/Sidebar/sidebar.jsx"
import Terminal from "./components/Terminal/terminal.jsx"
import Results from "./components/Results/results.jsx"
import ProfessorView from "./Dashboard/ProfessorView/ProfessorView.jsx"
import "./App.css"

function StudentShell({ isProfessor, claims, assignment }) {
  const [activeQuestion, setActiveQuestion] = useState(0)
  const [sessionId, setSessionId] = useState(null)

  const questions = assignment?.questions ?? []
  const currentQuestion = questions[activeQuestion] ?? null

  return (
    <div className="shell">
      <Sidebar
        isProfessor={isProfessor}
        claims={claims}
        assignment={assignment}
        activeQuestion={activeQuestion}
        onSelectQuestion={setActiveQuestion}
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
          </div>
          <div className="resultsBody">
            <Results question={currentQuestion} sessionId={sessionId} />
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

  try {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get("lti_claims")

    if (raw) {
      const standard = raw.replace(/-/g, "+").replace(/_/g, "/")
      const decoded = atob(standard)
      claims = JSON.parse(decoded)
      console.log("From Moodle:", claims)
    }
  } catch (error) {
    console.error("Failed to parse lti_claims", error)
  }

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000"
    fetch(`${apiUrl}/api/assignment/dummy`)
      .then(r => r.json())
      .then(data => setAssignment(data))
      .catch(err => console.error("Failed to load assignment", err))
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