import "./sidebar.css"
import { useNavigate } from "react-router-dom"

export default function Sidebar({ isProfessor }) {
  const navigate = useNavigate()

  return (
    <aside className="sidebarRoot">
      <header className="sidebarHeader">
        <h2 className="sidebarTitle">Assignment</h2>
        <p className="sidebarSub">Course</p>
      </header>

      <div className="sidebarBody">
        Given an array of length n, create a python program that will remove duplicate values from the given array. <br /><br />

        Example array: <br /><br />
        nums = [10, 99, 10, 12, 4]<br /><br />

        result = [10, 99, 12, 4]
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