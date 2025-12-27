// client/src/pages/QuestionnaireTemplatesPage.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DesignerNav from "../components/DesignerNav";
import {
  fetchQuestionnaireTemplates,
  createQuestionnaireTemplate,
  updateQuestionnaireTemplate,
  deleteQuestionnaireTemplate,
  uploadImage,
  syncTemplateToProjects,
} from "../api";

/**
 * QuestionnaireTemplatesPage
 *
 * Designer-only page to create and manage questionnaire templates.
 * Templates can later be assigned to projects and synced across projects.
 *
 * Sync modes:
 * - Safe sync: updates ONLY project instances that were not customized inside the project.
 * - Force sync: resets template-based parts in all projects using the template
 *   (but keeps client answers + project-only additions).
 */
export default function QuestionnaireTemplatesPage() {
  /* =========================================================
   * State
   * ========================================================= */

  // Templates list
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Saving covers: create / update / sync
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // If not null -> editing existing template
  const [editingId, setEditingId] = useState(null);

  // Form state for create/edit template
  const [form, setForm] = useState({
    title: "",
    description: "",
    roomType: "",
    questions: [],
  });

  /* =========================================================
   * Data loading
   * ========================================================= */

  // Fetch all templates for the current designer
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

  // Initial load
  useEffect(() => {
    loadTemplates();
  }, []);

  /* =========================================================
   * Form helpers
   * ========================================================= */

  // Update basic fields (title / roomType / description)
  function handleBasicChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Reset form and exit edit mode
  function resetForm() {
    setForm({
      title: "",
      description: "",
      roomType: "",
      questions: [],
    });
    setEditingId(null);
  }

  /* =========================================================
   * Question helpers (form.questions)
   * ========================================================= */

  // Add a new empty question
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

  // Remove a question by index
  function removeQuestion(index) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  }

  // Update a question field (text / multiple)
  function updateQuestionField(index, field, value) {
    setForm((prev) => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], [field]: value };
      return { ...prev, questions };
    });
  }

  /* =========================================================
   * Option helpers (question.options)
   * ========================================================= */

  // Add a new empty option to a question
  function addOption(questionIndex) {
    setForm((prev) => {
      const questions = [...prev.questions];
      const q = { ...questions[questionIndex] };

      q.options = [...(q.options || []), { text: "", imageUrl: "" }];
      questions[questionIndex] = q;

      return { ...prev, questions };
    });
  }

  // Remove an option from a question
  function removeOption(questionIndex, optionIndex) {
    setForm((prev) => {
      const questions = [...prev.questions];
      const q = { ...questions[questionIndex] };

      q.options = (q.options || []).filter((_, i) => i !== optionIndex);
      questions[questionIndex] = q;

      return { ...prev, questions };
    });
  }

  // Update option field (text / imageUrl)
  function updateOptionField(questionIndex, optionIndex, field, value) {
    setForm((prev) => {
      const questions = [...prev.questions];
      const q = { ...questions[questionIndex] };
      const opts = [...(q.options || [])];

      opts[optionIndex] = { ...opts[optionIndex], [field]: value };
      q.options = opts;
      questions[questionIndex] = q;

      return { ...prev, questions };
    });
  }

  // Upload an image and save the URL into option.imageUrl
  async function handleOptionImageUpload(questionIndex, optionIndex, file) {
    if (!file) return;

    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const { imageUrl } = await uploadImage(formData);
      updateOptionField(questionIndex, optionIndex, "imageUrl", imageUrl);
    } catch (err) {
      console.error("Image upload failed:", err);
      setError(err.message || "Failed to upload image");
    }
  }

  /* =========================================================
   * Create / update template
   * ========================================================= */

  // Submit form -> create or update template
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      title: form.title,
      description: form.description,
      roomType: form.roomType,
      questions: form.questions,
    };

    try {
      if (editingId) {
        await updateQuestionnaireTemplate(editingId, payload);
      } else {
        await createQuestionnaireTemplate(payload);
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

  /* =========================================================
   * Sync template to projects
   * ========================================================= */

  // Sync template changes into all projects using it (safe / force)
  async function handleSyncTemplate(templateId, mode = "safe") {
    if (mode === "force") {
      const ok = window.confirm(
        "Force sync will reset template-based questions/options in all projects using this template. Continue?"
      );
      if (!ok) return;
    }

    setSaving(true);
    setError("");

    try {
      await syncTemplateToProjects(templateId, mode);

      alert(
        mode === "safe"
          ? "Safe sync: updated projects that were NOT customized inside the project."
          : "Force sync: reset template-based parts in projects (client answers + project-only additions were kept)."
      );
    } catch (err) {
      console.error("Failed to sync template:", err);
      setError(err.message || "Failed to sync template");
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
   * Edit / delete
   * ========================================================= */

  // Load template into form for editing (keep question/option _id)
  function startEdit(tpl) {
    setEditingId(tpl._id);

    setForm({
      title: tpl.title || "",
      description: tpl.description || "",
      roomType: tpl.roomType || "",
      questions: (tpl.questions || []).map((q) => ({
        _id: q._id, // important: keep original question id
        text: q.text || "",
        multiple: q.multiple !== undefined ? q.multiple : true,
        options: (q.options || []).map((opt) => ({
          _id: opt._id, // important: keep original option id
          text: opt.text || "",
          imageUrl: opt.imageUrl || "",
        })),
      })),
    });
  }

  // Delete template by id
  async function handleDelete(id) {
    const ok = window.confirm("Delete this questionnaire template?");
    if (!ok) return;

    setError("");

    try {
      await deleteQuestionnaireTemplate(id);
      await loadTemplates();

      // If user deleted the template currently being edited, reset form
      if (String(editingId) === String(id)) {
        resetForm();
      }
    } catch (err) {
      console.error("Failed to delete template:", err);
      setError(err.message || "Failed to delete template");
    }
  }

  /* =========================================================
   * Styles (inline)
   * ========================================================= */

  const pageStyle = {
    minHeight: "100vh",
    padding: "40px 16px 60px",
    display: "flex",
    justifyContent: "center",
  };

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

  const linkStyle = {
    padding: "8px 16px",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    backgroundColor: "#f3f3f3",
    color: "#333333",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    textDecoration: "none",
  };

  const sectionTitleStyle = {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 10,
    marginTop: 24,
  };

  const helperTextStyle = {
    display: "block",
    marginBottom: 12,
    fontWeight: 600,
    textAlign: "center",
    color: "#333",
  };

  /* =========================================================
   * Render
   * ========================================================= */

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <DesignerNav active="questionnaires" />

        <div style={cardStyle}>
          <div style={titleRowStyle}>
            <h1 style={{ fontSize: 30, fontWeight: 700 }}>
              Design Questionnaires
            </h1>

            <div style={{ fontSize: 14 }}>
              <Link to="/designer" style={linkStyle}>
                Back to Dashboard
              </Link>
            </div>
          </div>

          <span style={helperTextStyle}>
            Build reusable templates to understand your client&apos;s style and
            preferences.
          </span>

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

          {/* Create / Edit form */}
          <section>
            <h2 style={sectionTitleStyle}>
              {editingId ? "Edit Questionnaire Template" : "Create Questionnaire Template"}
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

              {/* Questions */}
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3 style={{ margin: 0 }}>Questions</h3>
                  <button type="button" onClick={addQuestion} disabled={saving}>
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
                    key={q._id || qIndex}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: 10,
                      padding: 10,
                      marginTop: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>Question #{qIndex + 1}</strong>

                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        disabled={saving}
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
                          onChange={(e) => updateQuestionField(qIndex, "text", e.target.value)}
                          required
                          style={{ width: "100%" }}
                        />
                      </label>
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!q.multiple}
                          onChange={(e) => updateQuestionField(qIndex, "multiple", e.target.checked)}
                        />{" "}
                        Allow multiple selections
                      </label>
                    </div>

                    {/* Options */}
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
                          disabled={saving}
                          style={{ fontSize: 12 }}
                        >
                          + Add Option
                        </button>
                      </div>

                      {(q.options || []).length === 0 && (
                        <p style={{ fontSize: 13, color: "#777", marginTop: 4 }}>
                          No options yet.
                        </p>
                      )}

                      {(q.options || []).map((opt, optIndex) => (
                        <div
                          key={opt._id || optIndex}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 2fr auto auto auto",
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
                              updateOptionField(qIndex, optIndex, "text", e.target.value)
                            }
                          />

                          <input
                            type="text"
                            placeholder="Image URL (optional)"
                            value={opt.imageUrl}
                            onChange={(e) =>
                              updateOptionField(qIndex, optIndex, "imageUrl", e.target.value)
                            }
                          />

                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleOptionImageUpload(qIndex, optIndex, e.target.files?.[0])
                            }
                          />

                          <button
                            type="button"
                            onClick={() => updateOptionField(qIndex, optIndex, "imageUrl", "")}
                            disabled={saving}
                          >
                            Clear
                          </button>

                          <button
                            type="button"
                            onClick={() => removeOption(qIndex, optIndex)}
                            disabled={saving}
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

              {/* Form actions */}
              <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
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
                  <button type="button" onClick={resetForm} disabled={saving}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Templates table */}
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
                        <button onClick={() => startEdit(tpl)} disabled={saving}>
                          Edit
                        </button>

                        <button
                          style={{ marginLeft: 8 }}
                          onClick={() => handleDelete(tpl._id)}
                          disabled={saving}
                        >
                          Delete
                        </button>

                        <button
                          style={{ marginLeft: 8 }}
                          onClick={() => handleSyncTemplate(tpl._id, "safe")}
                          disabled={saving}
                        >
                          Sync to non-customized projects
                        </button>

                        <button
                          style={{ marginLeft: 8 }}
                          onClick={() => handleSyncTemplate(tpl._id, "force")}
                          disabled={saving}
                        >
                          Force sync (reset template parts)
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
