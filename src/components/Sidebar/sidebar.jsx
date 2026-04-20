import "./sidebar.css"
import { useNavigate } from "react-router-dom"
import { useState } from "react"

// Linux assignments data with titles and descriptions
const assignments = [
  { 
    id: 1, 
    title: "Linux File System Navigation",
    description: "Learn to navigate the Linux file system using commands like ls, cd, pwd, and understand directory structures including /home, /etc, /var, and /usr."
  },
  { 
    id: 2, 
    title: "File Permissions & Ownership",
    description: "Understand Linux file permissions (read, write, execute), change permissions using chmod, modify ownership with chown and chgrp commands."
  },
  { 
    id: 3, 
    title: "Process Management",
    description: "Learn to view, monitor, and manage Linux processes using ps, top, htop, kill, and background/foreground job control."
  },
  { 
    id: 4, 
    title: "Text Processing with grep & sed",
    description: "Master text search using grep with regular expressions, and perform text transformations using sed stream editor."
  },
  { 
    id: 5, 
    title: "Bash Scripting Basics",
    description: "Create and execute bash scripts, work with variables, conditionals, loops, and functions in shell scripting."
  },
  { 
    id: 6, 
    title: "Package Management (apt/yum)",
    description: "Learn to install, update, and remove software packages using apt (Debian/Ubuntu) and yum/dnf (RHEL/CentOS) package managers."
  },
  { 
    id: 7, 
    title: "User & Group Administration",
    description: "Manage Linux users and groups using useradd, usermod, userdel, groupadd, and configure sudo access for privileged operations."
  },
  { 
    id: 8, 
    title: "Network Configuration",
    description: "Configure network interfaces using ifconfig/ip commands, troubleshoot connectivity with ping, netstat, ss, and manage DNS settings."
  },
  { 
    id: 9, 
    title: "Cron Jobs & Task Scheduling",
    description: "Automate repetitive tasks using cron daemon, create crontab entries, and schedule scripts to run at specific times or intervals."
  },
  { 
    id: 10, 
    title: "Disk Management & Mounting",
    description: "Manage disk partitions with fdisk, format filesystems using mkfs, mount/unmount devices, and monitor disk usage with df and du."
  }
]

export default function Sidebar({ isProfessor, claims, onAssignmentChange }) {
  const navigate = useNavigate()
  const [openAssignmentId, setOpenAssignmentId] = useState(assignments[0].id) // First one open by default
  const [hoveredAssignmentId, setHoveredAssignmentId] = useState(null)

  const handleAssignmentClick = (assignment) => {
    // Toggle: if already open, close it; if closed, open it
    if (openAssignmentId === assignment.id) {
      setOpenAssignmentId(null) // Close
      if (onAssignmentChange) {
        onAssignmentChange(null) // Notify that no assignment is selected
      }
    } else {
      setOpenAssignmentId(assignment.id) // Open new one
      if (onAssignmentChange) {
        onAssignmentChange(assignment)
      }
    }
  }

  const resourceLink = claims?.["https://purl.imsglobal.org/spec/lti/claim/resource_link"]
  const context = claims?.["https://purl.imsglobal.org/spec/lti/claim/context"]

  const title = resourceLink?.title ?? "Linux Assignments"
  const description = resourceLink?.description ?? "No assignment loaded."
  const course = context?.label ?? context?.title ?? "Linux Course"

  return (
    <aside className="sidebarRoot">
      <header className="sidebarHeader">
        <h2 className="sidebarTitle">{title}</h2>
        <p className="sidebarSub">{course}</p>
      </header>

      {/* Assignments List Section */}
      <div className="assignmentsListSection">
        <div className="assignmentsList">
          {assignments.map((assignment, index) => (
            <div key={assignment.id} className="assignmentContainer">
              <div
                className={`assignmentItem ${openAssignmentId === assignment.id ? 'active' : ''}`}
                onClick={() => handleAssignmentClick(assignment)}
                onMouseEnter={() => setHoveredAssignmentId(assignment.id)}
                onMouseLeave={() => setHoveredAssignmentId(null)}
              >
                <span className="assignmentId">{assignment.id}.</span>
                <span className="assignmentTitle">{assignment.title}</span>
                {hoveredAssignmentId === assignment.id && (
                  <span className="dropdownArrow">
                    {openAssignmentId === assignment.id ? '▲' : '▼'}
                  </span>
                )}
                {openAssignmentId === assignment.id && !(hoveredAssignmentId === assignment.id) && (
                  <span className="activeIndicator">✓</span>
                )}
              </div>
              
              {/* Description appears only when this assignment is open */}
              {openAssignmentId === assignment.id && (
                <div className="assignmentDescriptionInline">
                  <p>{assignment.description}</p>
                </div>
              )}
              
              {index < assignments.length - 1 && <div className="separatorLine" />}
            </div>
          ))}
        </div>
      </div>

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