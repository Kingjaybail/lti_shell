import { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ import for navigation
import "./professorview.css";

export default function ProfessorView() {

  const navigate = useNavigate(); // ✅ inside the component

  const [assignments, setAssignments] = useState([
    { id: 1, title: "Remove Array Duplicates", course: "CS240", students: 40 },
    { id: 2, title: "Linux Pipes Practice", course: "CS240", students: 38 }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    course: ""
  });

  function handleChange(e){
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  function handleCreate(){
    setEditingId(null);
    setFormData({title:"",course:""});
    setShowForm(true);
  }

  function handleEdit(assignment){
    setEditingId(assignment.id);
    setFormData({
      title: assignment.title,
      course: assignment.course
    });
    setShowForm(true);
  }

  function handleDelete(id){
    const filtered = assignments.filter(a => a.id !== id);
    setAssignments(filtered);
  }

  function handleSubmit(e){
    e.preventDefault();

    if(editingId){
      const updated = assignments.map(a =>
        a.id === editingId
        ? {...a, title: formData.title, course: formData.course}
        : a
      );
      setAssignments(updated);

    } else {
      const newAssignment = {
        id: Date.now(),
        title: formData.title,
        course: formData.course,
        students: 0
      };
      setAssignments([...assignments, newAssignment]);
    }

    setShowForm(false);
  }

  return(
    <div className="profRoot">

      <header className="profHeader">
        <h1>Assignment Manager</h1>

        <div>
          {/* Existing Create Assignment button */}
          <button className="createBtn" onClick={handleCreate}>
            + Create Assignment
          </button>

          {/* ✅ New View as Student button */}
          <button
            className="viewStudentBtn"
            onClick={() => navigate("/")} // redirects to student view
          >
            View as Student
          </button>
        </div>
      </header>

      {showForm && (
        <div className="formModal">
          <form className="assignmentForm" onSubmit={handleSubmit}>
            <h2>{editingId ? "Edit Assignment" : "Create Assignment"}</h2>

            <label>Title</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />

            <label>Course</label>
            <input
              name="course"
              value={formData.course}
              onChange={handleChange}
              required
            />

            <div className="formButtons">
              <button type="submit">Save</button>
              <button type="button" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <table className="assignmentTable">
        <thead>
          <tr>
            <th>Assignment</th>
            <th>Course</th>
            <th>Students</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a)=>(
            <tr key={a.id}>
              <td>{a.title}</td>
              <td>{a.course}</td>
              <td>{a.students}</td>
              <td>
                <button onClick={()=>handleEdit(a)}>Edit</button>
                <button onClick={()=>handleDelete(a.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}