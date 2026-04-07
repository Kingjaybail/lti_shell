import "./sidebar.css"
import { useNavigate } from "react-router-dom"

export default function Sidebar({ isProfessor, assignment }) {
  const navigate = useNavigate()

  return (
    <aside className="sidebarRoot">
      <header className="sidebarHeader">
        <h2 className="sidebarTitle">{assignment?.title || "Assignment"}</h2>
        <p className="sidebarSub">{assignment?.course || "Course"}</p>
      </header>

      <div className="sidebarBody" style={{ whiteSpace: "pre-wrap" }}>
        {assignment?.description || "No assignment loaded."}
      </div>

      <footer className="sidebarFooter">
        {isProfessor && (
          <button onClick={() => navigate("/professor")}>
            Professor View
          </button>
        )}
      </footer>
    </aside>
  )
}