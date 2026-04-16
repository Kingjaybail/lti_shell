import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./professorview.css";

export default function ProfessorView() {
  const navigate = useNavigate();

  //list of assignments shown on the page
  const [assignments, setAssignments] = useState([
  {
    id: 1,
    title: "Week 1 Arrays",
    course: "CS240",
    fileName: null,
    questions: [
      {
        id: 11,
        questionText: "Write a function that removes duplicate values from an array.",
        type: "code",
        points: 10
      }
    ],
    totalPoints: 10
  },
  {
    id: 2,
    title: "Linux Basics",
    course: "CS240",
    fileName: "linux_intro.pdf",
    questions: [
      {
        id: 21,
        questionText: "Write a command that prints the current working directory.",
        type: "code",
        points: 5
      },
      {
        id: 22,
        questionText: "Write a command to list all files in the current directory.",
        type: "code",
        points: 10
      }
    ],
    totalPoints: 15
  }
]);

  // Controls whether the modal is open
  const [showForm, setShowForm] = useState(false);

  // Tracks whether user is editing an existing assignment
  const [editingId, setEditingId] = useState(null);

  // Form state for assignment creation/editing
  const [formData, setFormData] = useState({
    title: "",
    course: "",
    file: null,
    questions: []
  });

  // Handles normal input changes for title/course
  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  // Handles file selection
  function handleFileChange(e) {
    const selectedFile = e.target.files[0] || null;

    setFormData({
      ...formData,
      file: selectedFile
    });
  }

  // Opens modal for a new assignment
  function handleCreate() {
    setEditingId(null);
    setFormData({
      title: "",
      course: "",
      file: null,
      questions: []
    });
    setShowForm(true);
  }

  // Opens modal and loads existing assignment data
  function handleEdit(assignment) {
    setEditingId(assignment.id);
    setFormData({
      title: assignment.title,
      course: assignment.course,
      file: assignment.fileName
        ? { name: assignment.fileName }
        : null,
      questions: assignment.questions
    });
    setShowForm(true);
  }

  // Deletes an assignment
  function handleDelete(id) {
    const filteredAssignments = assignments.filter((a) => a.id !== id);
    setAssignments(filteredAssignments);
  }

  // Adds a blank gradable question to the form
  function handleAddQuestion() {
    const newQuestion = {
      id: Date.now(),
      questionText: "",
      type: "short_answer",
      points: 0
    };

    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    });
  }

  // Updates one field inside a question
  function handleQuestionChange(id, field, value) {
    const updatedQuestions = formData.questions.map((q) =>
      q.id === id ? { ...q, [field]: value } : q
    );

    setFormData({
      ...formData,
      questions: updatedQuestions
    });
  }

  // Removes a question from the form
  function handleRemoveQuestion(id) {
    const updatedQuestions = formData.questions.filter((q) => q.id !== id);

    setFormData({
      ...formData,
      questions: updatedQuestions
    });
  }

  // Saves a new or edited assignment
  function handleSubmit(e) {
    e.preventDefault();

    // Add up all question points
    const totalPoints = formData.questions.reduce(
      (sum, q) => sum + Number(q.points || 0),
      0
    );

    const newAssignment = {
      id: editingId || Date.now(),
      title: formData.title,
      course: formData.course,
      fileName: formData.file ? formData.file.name : null,
      questions: formData.questions,
      totalPoints: totalPoints
    };

    if (editingId) {
      const updatedAssignments = assignments.map((a) =>
        a.id === editingId ? newAssignment : a
      );
      setAssignments(updatedAssignments);
    } else {
      setAssignments([...assignments, newAssignment]);
    }

    // Reset form after saving
    setFormData({
      title: "",
      course: "",
      file: null,
      questions: []
    });

    setEditingId(null);
    setShowForm(false);
  }

  return (
    <div className="profRoot">
      <header className="profHeader">
        <h1>Assignment Manager</h1>

        <div>
          <button className="createBtn" onClick={handleCreate}>
            + Create Assignment
          </button>

          <button
            className="viewStudentBtn"
            onClick={() => navigate("/")}
          >
            View as Student
          </button>
        </div>
      </header>

      {showForm && (
        <div className="formModal">
          <form className="assignmentForm" onSubmit={handleSubmit}>
            <h2>{editingId ? "Edit Assignment" : "Create Assignment"}</h2>

            <label>Assignment Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter assignment title"
              required
            />

            <label>Course</label>
            <input
              type="text"
              name="course"
              value={formData.course}
              onChange={handleChange}
              placeholder="Enter course name"
              required
            />

            <label>Upload File</label>
            <input type="file" onChange={handleFileChange} />

            {formData.file && (
              <p className="fileText">Selected file: {formData.file.name}</p>
            )}

            <div className="questionHeader">
              <h3>Gradable Questions</h3>
              <button
                type="button"
                className="addQuestionBtn"
                onClick={handleAddQuestion}
              >
                + Add Question
              </button>
            </div>

            {formData.questions.length === 0 && (
              <p className="emptyText">
                No questions added yet. You can upload a file, add questions, or do both.
              </p>
            )}

            {formData.questions.map((q, index) => (
              <div key={q.id} className="questionCard">
                <h4>Question {index + 1}</h4>

                <label>Question Text</label>
                <textarea
                  value={q.questionText}
                  onChange={(e) =>
                    handleQuestionChange(q.id, "questionText", e.target.value)
                  }
                  placeholder="Enter question text"
                  required
                />

                <label>Question Type</label>
                <select
                  value={q.type}
                  onChange={(e) =>
                    handleQuestionChange(q.id, "type", e.target.value)
                  }
                >
                  <option value="code">Code</option>
                </select>

                <label>Points</label>
                <input
                  type="number"
                  min="0"
                  value={q.points}
                  onChange={(e) =>
                    handleQuestionChange(q.id, "points", Number(e.target.value))
                  }
                  required
                />

                <button
                  type="button"
                  className="removeBtn"
                  onClick={() => handleRemoveQuestion(q.id)}
                >
                  Remove Question
                </button>
              </div>
            ))}

            <div className="formButtons">
              <button type="submit" className="saveBtn">
                Save Assignment
              </button>
              <button
                type="button"
                className="cancelBtn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <table className="assignmentTable">
        <thead>
          <tr>
            <th>Assignment</th>
            <th>Course</th>
            <th>File</th>
            <th>Questions</th>
            <th>Total Points</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {assignments.length === 0 ? (
            <tr>
              <td colSpan="6" className="emptyRow">
                No assignments created yet.
              </td>
            </tr>
          ) : (
            assignments.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>{a.course}</td>
                <td>{a.fileName ? a.fileName : "No file"}</td>
                <td>{a.questions.length}</td>
                <td>{a.totalPoints}</td>
                <td>
                  <button onClick={() => handleEdit(a)}>Edit</button>
                  <button onClick={() => handleDelete(a.id)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}