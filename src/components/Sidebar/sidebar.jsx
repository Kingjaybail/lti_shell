import "./sidebar.css"
import { useNavigate } from "react-router-dom"

export default function Sidebar({ isProfessor, claims }) {
  const navigate = useNavigate()

  const resourceLink = claims?.["https://purl.imsglobal.org/spec/lti/claim/resource_link"]
  const context = claims?.["https://purl.imsglobal.org/spec/lti/claim/context"]

  const title = resourceLink?.title ?? "Assignment"
  const description = resourceLink?.description ?? "No assignment loaded."
  const course = context?.label ?? context?.title ?? "Course"

  return (
    <aside className="sidebarRoot">
      <header className="sidebarHeader">
        <h2 className="sidebarTitle">{title}</h2>
        <p className="sidebarSub">{course}</p>
      </header>

      <div className="sidebarBody" style={{ whiteSpace: "pre-wrap" }}>
        {description}
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