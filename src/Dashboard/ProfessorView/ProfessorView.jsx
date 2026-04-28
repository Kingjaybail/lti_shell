import { useState } from "react";
import "./professorview.css";

const emptyTestCase = () => ({ input: "", expected_output: "", stdin: "" });
const emptyQuestion = () => ({ id: crypto.randomUUID(), prompt: "", test_cases: [emptyTestCase()] });

export default function ProfessorView({ assignment, claims, apiUrl, onAssignmentUpdate, onClose }) {

  const [questions, setQuestions] = useState(assignment?.questions ?? []);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const resourceLink = claims?.["https://purl.imsglobal.org/spec/lti/claim/resource_link"];
  const context = claims?.["https://purl.imsglobal.org/spec/lti/claim/context"];
  const assignmentId = assignment?.moodle_resource_id;
  const courseId = assignment?.moodle_course_id;

  function openCreate() {
    setFormData(emptyQuestion());
    setEditingIndex(null);
  }

  function openEdit(i) {
    setFormData(JSON.parse(JSON.stringify(questions[i])));
    setEditingIndex(i);
  }

  function closeForm() {
    setFormData(null);
    setEditingIndex(null);
  }

  function handlePromptChange(e) {
    setFormData(f => ({ ...f, prompt: e.target.value }));
  }

  function handleTestCaseChange(tcIndex, field, value) {
    setFormData(f => {
      const tcs = [...f.test_cases];
      tcs[tcIndex] = { ...tcs[tcIndex], [field]: value };
      return { ...f, test_cases: tcs };
    });
  }

  function addTestCase() {
    setFormData(f => ({ ...f, test_cases: [...f.test_cases, emptyTestCase()] }));
  }

  function removeTestCase(tcIndex) {
    setFormData(f => ({
      ...f,
      test_cases: f.test_cases.filter((_, i) => i !== tcIndex),
    }));
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const cleaned = {
      ...formData,
      test_cases: formData.test_cases.map(tc => ({
        input: tc.input,
        expected_output: tc.expected_output,
        stdin: tc.stdin || null,
      })),
    };
    if (editingIndex !== null) {
      setQuestions(qs => qs.map((q, i) => i === editingIndex ? cleaned : q));
    } else {
      setQuestions(qs => [...qs, cleaned]);
    }
    closeForm();
  }

  function deleteQuestion(i) {
    setQuestions(qs => qs.filter((_, idx) => idx !== i));
  }

  async function saveToMongo() {
    if (!assignmentId || !courseId) {
      setSaveError("No Moodle assignment loaded — cannot save.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${apiUrl}/api/assignment/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignmentId,
          course_id: courseId,
          questions,
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      onAssignmentUpdate?.({ ...assignment, questions });
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profRoot">
      <header className="profHeader">
        <div>
          <h1>{assignment?.title ?? resourceLink?.title ?? "Assignment"}</h1>
          <p style={{ margin: 0, opacity: 0.6, fontSize: 13 }}>
            {assignment?.class_name ?? context?.label ?? "Course"} &mdash; manage questions below
          </p>
        </div>
        <div className="headerActions">
          <button className="btn btn-primary" onClick={openCreate}>+ Add Question</button>
          <button className="btn btn-success" onClick={saveToMongo} disabled={saving}>
            {saving ? "Saving…" : "Save Questions"}
          </button>
          <button className="btn btn-warning" onClick={onClose}>View as Student</button>
        </div>
      </header>

      {saveError && <p className="saveError">{saveError}</p>}

      {/* Question list */}
      <table className="assignmentTable">
        <thead>
          <tr>
            <th>#</th>
            <th>Question</th>
            <th>Test Cases</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {questions.length === 0 && (
            <tr><td colSpan={4} style={{ opacity: 0.5, textAlign: "center" }}>No questions yet.</td></tr>
          )}
          {questions.map((q, i) => (
            <tr key={q.id ?? i}>
              <td>{i + 1}</td>
              <td>{q.prompt.length > 80 ? q.prompt.slice(0, 80) + "…" : q.prompt}</td>
              <td>{q.test_cases.length}</td>
              <td>
                <div className="tableActions">
                  <button className="btn btn-success" onClick={() => openEdit(i)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => deleteQuestion(i)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Question form modal */}
      {formData && (
        <div className="formModal">
          <form className="assignmentForm questionForm" onSubmit={handleFormSubmit}>
            <h2>{editingIndex !== null ? "Edit Question" : "New Question"}</h2>

            <label>Prompt</label>
            <textarea
              rows={3}
              value={formData.prompt}
              onChange={handlePromptChange}
              required
            />

            <label style={{ marginTop: 12 }}>Test Cases</label>
            {formData.test_cases.map((tc, tcIdx) => (
              <div key={tcIdx} className="testCaseRow">
                <span className="tcLabel">#{tcIdx + 1}</span>
                <div className="tcFields">
                  <input
                    placeholder="Command (e.g. python3 hello.py)"
                    value={tc.input}
                    onChange={e => handleTestCaseChange(tcIdx, "input", e.target.value)}
                    required
                  />
                  <textarea
                    placeholder="Expected output"
                    rows={3}
                    value={tc.expected_output}
                    onChange={e => handleTestCaseChange(tcIdx, "expected_output", e.target.value)}
                    required
                    style={{ resize: "vertical", fontFamily: "monospace" }}
                  />
                </div>
                {formData.test_cases.length > 1 && (
                  <button type="button" className="btn btn-danger" style={{ padding: "4px 8px", marginTop: 8, fontSize: 11 }} onClick={() => removeTestCase(tcIdx)}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-ghost" onClick={addTestCase}>+ Add Test Case</button>

            <div className="formButtons">
              <button type="button" className="btn btn-danger" onClick={closeForm}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Question</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
