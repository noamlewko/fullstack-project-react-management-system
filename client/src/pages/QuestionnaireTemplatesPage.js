// client/src/pages/QuestionnaireTemplatesPage.js

import React, { useEffect, useState } from "react";
import {
  fetchQuestionnaireTemplates,
  createQuestionnaireTemplate,
  updateQuestionnaireTemplate,
  deleteQuestionnaireTemplate,
} from "../api";
import { Link } from "react-router-dom";
import DesignerNav from "../components/DesignerNav";

export default function QuestionnaireTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    roomType: "",
    questions: [],
  });

  /* ---------- Load all questionnaire templates for the designer ---------- */

  async function loadTemplates() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchQuestionnaireTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load templates:", err);
      setError(err.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  /* ---------- Basic form field changes (title, description, roomType) ---------- */

  function handleBasicChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  /* ---------- Questions management ---------- */

  function addQuestion() {
    setForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          text: "",
          multiple: true,
          options: [],
        },
      ],
    }));
  }

  function removeQuestion(index) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  }

  function updateQuestionField(index, field, value) {
    setForm((prev) => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], [field]: value };
      return { ...prev, questions };
    });
  }

  /* ---------- Options management for each question ---------- */

  function addOption(questionIndex) {
    setForm((prev) => {
      const questions = [...prev.questions];
      const q = { ...questions[questionIndex] };
      q.options = [...(q.options || []), { text: "", imageUrl: "" }];
      questions[questionIndex] = q;
      return { ...prev, questions };
    });
  }

  function removeOption(questionIndex, optionIndex) {
    setForm((prev) => {
      const questions = [...prev.questions];
      const q = { ...questions[questionIndex] };
      q.options = q.options.filter((_, i) => i !== optionIndex);
      questions[questionIndex] = q;
      return { ...prev, questions };
    });
  }

  function updateOptionField(questionIndex, optionIndex, field, value) {
    setForm((prev) => {
      const questions = [...prev.questions];
      const q = { ...questions[questionIndex] };
      const opts = [...(q.options || [])];
      const opt = { ...opts[optionIndex], [field]: value };
      opts[optionIndex] = opt;
      q.options = opts;
      questions[questionIndex] = q;
      return { ...prev, questions };
    });
  }

  /* ---------- Reset form (clear fields and exit edit mode) ---------- */

  function resetForm() {
    setForm({
      title: "",
      description: "",
      roomType: "",
      questions: [],
    });
    setEditingId(null);
  }

  /* ---------- Submit (create / update template) ---------- */

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      title: form.title,
      description: form.description,
      roomType: form.roomType,
      questions: form.questions,
    };

    try {
      if (editingId) {
        // Update existing template
        await updateQuestionnaireTemplate(editingId, body);
      } else {
        // Create new template
        await createQuestionnaireTemplate(body);
      }

      await loadTemplates();
      resetForm();
    } catch (err) {
      console.error("Failed to save template:", err);
      setError(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  /* ---------- Edit / Delete handlers ---------- */

  function startEdit(tpl) {
    setEditingId(tpl._id);
    setForm({
      title: tpl.title || "",
      description: tpl.description || "",
      roomType: tpl.roomType || "",
      questions:
        (tpl.questions || []).map((q) => ({
          text: q.text || "",
          multiple: q.multiple !== undefined ? q.multiple : true,
          options: (q.options || []).map((opt) => ({
            text: opt.text || "",
            imageUrl: opt.imageUrl || "",
          })),
        })) || [],
    });
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this questionnaire template?")) return;

    setError("");
    try {
      await deleteQuestionnaireTemplate(id);
      await loadTemplates();
    } catch (err) {
      console.error("Failed to delete template:", err);
      setError(err.message || "Failed to delete template");
    }
  }

  /* ---------- Layout & basic styling (side nav + main card) ---------- */

  const pageStyle = {
    minHeight: "100vh",
    padding: "40px 16px 60px",
    display: "flex",
    justifyContent: "center",
  };

  // Left: navigation, Right: main content
  const layoutStyle = {
    width: "100%",
    maxWidth: 1150,
    display: "grid",
    gridTemplateColumns: "260px auto",
    gap: 24,
  };

  const cardStyle = {
    width: "100%",
    background: "rgba(255, 255, 255, 0.94)",
    borderRadius: 18,
    padding: "28px 32px 32px",
    boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,192,203,0.7)",
  };

  const titleRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  };

  const sectionTitleStyle = {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 10,
    marginTop: 24,
  };

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        {/* Left side navigation – highlight Questionnaires section in pink */}
        <DesignerNav active="questionnaires" />

        {/* Main content card – on the right */}
        <div style={cardStyle}>
          <div style={titleRowStyle}>
            <h1 style={{ fontSize: 30, fontWeight: 700 }}>
              Design Questionnaires
            </h1>
            <div style={{ fontSize: 14 }}>
              <Link to="/designer">← Back to projects</Link>
            </div>
          </div>

          <p style={{ marginBottom: 16 }}>
            Create questionnaires to understand your client&apos;s style and
            preferences.
          </p>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "8px 10px",
                borderRadius: 10,
                background: "#ffe5e5",
                color: "#b00020",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {/* Create / Edit template form */}
          <section>
            <h2 style={sectionTitleStyle}>
              {editingId
                ? "Edit Questionnaire Template"
                : "Create Questionnaire Template"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "1fr 1fr",
                }}
              >
                <label>
                  Title:
                  <br />
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleBasicChange}
                    required
                    style={{ width: "100%" }}
                  />
                </label>

                <label>
                  Room Type:
                  <br />
                  <input
                    type="text"
                    name="roomType"
                    value={form.roomType}
                    onChange={handleBasicChange}
                    placeholder="Living room, Bedroom, General..."
                    style={{ width: "100%" }}
                  />
                </label>
              </div>

              <div style={{ marginTop: 12 }}>
                <label>
                  Description:
                  <br />
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleBasicChange}
                    rows={2}
                    style={{ width: "100%" }}
                  />
                </label>
              </div>

              {/* Questions list */}
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3 style={{ margin: 0 }}>Questions</h3>
                  <button type="button" onClick={addQuestion}>
                    + Add Question
                  </button>
                </div>

                {form.questions.length === 0 && (
                  <p style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
                    No questions yet. Click &quot;Add Question&quot; to start.
                  </p>
                )}

                {form.questions.map((q, qIndex) => (
                  <div
                    key={qIndex}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: 10,
                      padding: 10,
                      marginTop: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <strong>Question #{qIndex + 1}</strong>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        style={{ fontSize: 12 }}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <label>
                        Text:
                        <br />
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) =>
                            updateQuestionField(
                              qIndex,
                              "text",
                              e.target.value
                            )
                          }
                          required
                          style={{ width: "100%" }}
                        />
                      </label>
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={q.multiple}
                          onChange={(e) =>
                            updateQuestionField(
                              qIndex,
                              "multiple",
                              e.target.checked
                            )
                          }
                        />{" "}
                        Allow multiple selections
                      </label>
                    </div>

                    {/* Options for this question */}
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>Options:</span>
                        <button
                          type="button"
                          onClick={() => addOption(qIndex)}
                          style={{ fontSize: 12 }}
                        >
                          + Add Option
                        </button>
                      </div>

                      {(q.options || []).length === 0 && (
                        <p
                          style={{
                            fontSize: 13,
                            color: "#777",
                            marginTop: 4,
                          }}
                        >
                          No options yet.
                        </p>
                      )}

                      {(q.options || []).map((opt, optIndex) => (
                        <div
                          key={optIndex}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 2fr auto",
                            gap: 6,
                            alignItems: "center",
                            marginTop: 6,
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Option text"
                            value={opt.text}
                            onChange={(e) =>
                              updateOptionField(
                                qIndex,
                                optIndex,
                                "text",
                                e.target.value
                              )
                            }
                          />
                          <input
                            type="text"
                            placeholder="Image URL (optional)"
                            value={opt.imageUrl}
                            onChange={(e) =>
                              updateOptionField(
                                qIndex,
                                optIndex,
                                "imageUrl",
                                e.target.value
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              removeOption(qIndex, optIndex)
                            }
                            style={{ fontSize: 11 }}
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 18 }}>
                <button type="submit" disabled={saving}>
                  {saving
                    ? editingId
                      ? "Saving..."
                      : "Creating..."
                    : editingId
                    ? "Save Changes"
                    : "Create Template"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    style={{ marginLeft: 8 }}
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Templates list */}
          <section>
            <h2 style={sectionTitleStyle}>Your Templates</h2>
            {loading ? (
              <p>Loading templates...</p>
            ) : templates.length === 0 ? (
              <p>No templates yet.</p>
            ) : (
              <table
                border="1"
                cellPadding="8"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Room Type</th>
                    <th>Questions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tpl) => (
                    <tr key={tpl._id}>
                      <td>{tpl.title}</td>
                      <td>{tpl.roomType || "—"}</td>
                      <td>{(tpl.questions || []).length}</td>
                      <td>
                        <button onClick={() => startEdit(tpl)}>
                          Edit
                        </button>
                        <button
                          style={{ marginLeft: 8 }}
                          onClick={() => handleDelete(tpl._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
