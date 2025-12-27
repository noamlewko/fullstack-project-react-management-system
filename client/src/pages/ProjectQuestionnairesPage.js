// src/pages/ProjectQuestionnairesPage.js
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  apiFetch,
  uploadImage,
  updateProjectQuestionnaireInstance,
} from "../api";

/**
 * ProjectQuestionnairesPage
 *
 * Client: Fill and save answers for the project's questionnaire.
 * Designer: Assign templates + create a "project-only" customized version (questions/options).
 *
 * Key idea:
 * - Answers are stored by sourceQuestionId/sourceOptionId when available (stable across sync).
 * - Project-only edits do NOT affect the template or other projects.
 */
export default function ProjectQuestionnairesPage() {
  const { projectId } = useParams();
  const role = localStorage.getItem("role") || "client";
  const isDesigner = role === "designer";

  // Full project document loaded from backend
  const [project, setProject] = useState(null);

  // Designer-only: list of all templates
  const [templates, setTemplates] = useState([]);

  // Designer-only: selected template to assign/update in this project
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Currently selected questionnaire instance id inside the project
  const [selectedInstanceId, setSelectedInstanceId] = useState("");

  // Answers state:
  // { [questionKey]: { selectedOptions: [optionKey...], freeText: "" } }
  const [answers, setAnswers] = useState({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Modal image preview
  const [modalImage, setModalImage] = useState(null);

  // Designer-only: project-only edit mode (draft)
  const [editingInstance, setEditingInstance] = useState(false);
  const [draftQuestions, setDraftQuestions] = useState([]);

  /* =========================================================
   * Helpers (stable keys + deep copy)
   * ========================================================= */

  // Return stable question key (prefer sourceQuestionId if exists)
  function getQuestionKey(q) {
    return String(q?.sourceQuestionId || q?._id || "");
  }

  // Return stable option key (prefer sourceOptionId if exists)
  function getOptionKey(opt) {
    return String(opt?.sourceOptionId || opt?._id || "");
  }

  // Simple deep copy for safe draft editing
  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* =========================================================
   * Loaders
   * ========================================================= */

  // Load project + initialize selected instance + answers; load templates if designer
  async function loadAll() {
    if (!projectId) return;

    setLoading(true);
    setError("");

    try {
      const proj = await apiFetch(`/api/projects/${projectId}`);
      setProject(proj);

      const assigned = Array.isArray(proj.designQuestionnaires)
        ? proj.designQuestionnaires
        : [];

      if (assigned.length > 0) {
        setSelectedInstanceId(String(assigned[0]._id));
        loadAnswersFromInstance(assigned[0]);

        if (isDesigner) {
          setDraftQuestions(deepCopy(assigned[0].questions || []));
        }
      } else {
        setSelectedInstanceId("");
        setAnswers({});
        if (isDesigner) setDraftQuestions([]);
      }

      if (isDesigner) {
        const tpls = await apiFetch("/api/questionnaires/templates");
        setTemplates(Array.isArray(tpls) ? tpls : []);
      }
    } catch (err) {
      console.error("Error loading questionnaire page:", err);
      setError(err.message || "Failed to load questionnaire");
    } finally {
      setLoading(false);
    }
  }

  // Run loader on mount / projectId change / role change
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, role]);

  /* =========================================================
   * Answers mapping
   * ========================================================= */

  // Convert instance.answers array to UI state map keyed by sourceQuestionId (preferred)
  function loadAnswersFromInstance(instance) {
    if (!instance || !Array.isArray(instance.answers)) {
      setAnswers({});
      return;
    }

    const map = {};

    instance.answers.forEach((a) => {
      const savedQId = String(a.questionId || "");
      if (!savedQId) return;

      // If saved by project _id previously, translate to sourceQuestionId
      const qInInstance = (instance.questions || []).find(
        (q) => String(q._id) === savedQId
      );

      const finalQKey = String(qInInstance?.sourceQuestionId || savedQId);

      map[finalQKey] = {
        selectedOptions: Array.isArray(a.selectedOptions)
          ? a.selectedOptions.map((opt) => String(opt.optionId))
          : [],
        freeText: a.freeText || "",
      };
    });

    setAnswers(map);
  }

  /* =========================================================
   * Instance selection + template assignment (Designer)
   * ========================================================= */

  // Switch currently displayed questionnaire instance inside the project
  function handleSelectedInstanceChange(e) {
    const newInstanceId = e.target.value;
    setSelectedInstanceId(newInstanceId);

    const instances = Array.isArray(project?.designQuestionnaires)
      ? project.designQuestionnaires
      : [];

    const instance = instances.find(
      (q) => String(q._id) === String(newInstanceId)
    );

    loadAnswersFromInstance(instance);

    if (isDesigner && instance) {
      setDraftQuestions(deepCopy(instance.questions || []));
      setEditingInstance(false);
    }
  }

  // Store the designer-selected template id
  function handleDesignerTemplateSelect(e) {
    setSelectedTemplateId(e.target.value);
  }

  // Assign/update selected template inside this project (Designer)
  async function handleAssignTemplate() {
    if (!selectedTemplateId) return;

    setSaving(true);
    setError("");

    try {
      const res = await apiFetch(
        `/api/projects/${projectId}/questionnaire/assign`,
        {
          method: "POST",
          body: JSON.stringify({ templateId: selectedTemplateId }),
        }
      );

      const updatedProject = res.project || res;
      setProject(updatedProject);

      const assigned = Array.isArray(updatedProject.designQuestionnaires)
        ? updatedProject.designQuestionnaires
        : [];

      const instance = assigned.find(
        (q) => String(q.templateId) === String(selectedTemplateId)
      );

      if (instance) {
        setSelectedInstanceId(String(instance._id));
        loadAnswersFromInstance(instance);
        if (isDesigner) setDraftQuestions(deepCopy(instance.questions || []));
      }
    } catch (err) {
      console.error("Error assigning template:", err);
      setError(err.message || "Failed to assign questionnaire");
    } finally {
      setSaving(false);
    }
  }

  // Remove current questionnaire instance from project (Designer)
  async function handleRemoveCurrentQuestionnaire() {
    if (!projectId || !selectedInstanceId) return;

    const ok = window.confirm(
      "Remove this questionnaire from this project? Clients will no longer see it."
    );
    if (!ok) return;

    setSaving(true);
    setError("");

    try {
      const res = await apiFetch(
        `/api/projects/${projectId}/questionnaires/${selectedInstanceId}`,
        { method: "DELETE" }
      );

      const updatedProject = res.project || res;
      setProject(updatedProject);

      const instances = Array.isArray(updatedProject.designQuestionnaires)
        ? updatedProject.designQuestionnaires
        : [];

      if (instances.length === 0) {
        setSelectedInstanceId("");
        setAnswers({});
        if (isDesigner) setDraftQuestions([]);
      } else {
        const first = instances[0];
        setSelectedInstanceId(String(first._id));
        loadAnswersFromInstance(first);
        if (isDesigner) setDraftQuestions(deepCopy(first.questions || []));
      }
    } catch (err) {
      console.error("Error removing questionnaire:", err);
      setError(err.message || "Failed to remove questionnaire");
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
   * Answer editing (Client + Designer)
   * ========================================================= */

  // Toggle an option for a question (single or multi)
  function toggleOption(questionKey, optionKey, multiple) {
    setAnswers((prev) => {
      const key = String(questionKey);
      const existing = prev[key] || { selectedOptions: [], freeText: "" };
      let selected = [...existing.selectedOptions];

      if (multiple) {
        if (selected.includes(optionKey)) {
          selected = selected.filter((id) => id !== optionKey);
        } else {
          selected.push(optionKey);
        }
      } else {
        selected = selected.includes(optionKey) ? [] : [optionKey];
      }

      return { ...prev, [key]: { ...existing, selectedOptions: selected } };
    });
  }

  // Update free text for a question
  function handleFreeTextChange(questionKey, value) {
    setAnswers((prev) => {
      const key = String(questionKey);
      const existing = prev[key] || { selectedOptions: [], freeText: "" };
      return { ...prev, [key]: { ...existing, freeText: value } };
    });
  }

  /* =========================================================
   * Save answers (backend)
   * ========================================================= */

  // Save current answers into backend (uses stable source ids)
  async function saveAllAnswers() {
    if (!project || !selectedInstanceId) return;

    setSaving(true);
    setError("");

    try {
      const instances = Array.isArray(project.designQuestionnaires)
        ? project.designQuestionnaires
        : [];

      const instance = instances.find(
        (q) => String(q._id) === String(selectedInstanceId)
      );

      if (!instance) {
        setError("No questionnaire instance found for this project");
        setSaving(false);
        return;
      }

      const questions = Array.isArray(instance.questions) ? instance.questions : [];

      const payloadAnswers = questions.map((q) => {
        const qKey = getQuestionKey(q);
        const entry = answers[qKey] || { selectedOptions: [], freeText: "" };

        return {
          questionId: qKey,
          questionText: q.text,
          selectedOptions: (q.options || [])
            .filter((opt) => entry.selectedOptions.includes(getOptionKey(opt)))
            .map((opt) => ({
              optionId: getOptionKey(opt),
              name: opt.text,
              imageUrl: opt.imageUrl || "",
            })),
          freeText: entry.freeText || "",
        };
      });

      const res = await apiFetch(`/api/projects/${projectId}/questionnaire/answers`, {
        method: "POST",
        body: JSON.stringify({
          templateId: String(instance.templateId),
          answers: payloadAnswers,
        }),
      });

      const updatedProject = res.project || res;
      setProject(updatedProject);

      // Reload answers from backend version to keep UI in sync
      const updatedInstance = (updatedProject.designQuestionnaires || []).find(
        (q) => String(q._id) === String(selectedInstanceId)
      );
      if (updatedInstance) {
        loadAnswersFromInstance(updatedInstance);
      }
    } catch (err) {
      console.error("Error saving questionnaire answers:", err);
      setError(err.message || "Failed to save answers");
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
   * Project-only edits (Designer)
   * ========================================================= */

  // Toggle edit mode for project-only version (Designer)
  function toggleProjectEditMode() {
    if (!isDesigner || !currentInstance) return;

    if (!editingInstance) {
      setDraftQuestions(deepCopy(currentInstance.questions || []));
      setEditingInstance(true);
      return;
    }

    const ok = window.confirm(
      "Discard project-only changes? Your unsaved edits will be lost."
    );
    if (ok) setEditingInstance(false);
  }

  // Save draftQuestions as the project-only questionnaire version (Designer)
  async function saveProjectVersion() {
    if (!projectId || !selectedInstanceId) return;

    setSaving(true);
    setError("");

    try {
      const res = await updateProjectQuestionnaireInstance(
        projectId,
        selectedInstanceId,
        { questions: draftQuestions }
      );

      const updatedProject = res.project || res;
      setProject(updatedProject);

      const updatedInstance = (updatedProject.designQuestionnaires || []).find(
        (q) => String(q._id) === String(selectedInstanceId)
      );

      if (updatedInstance) {
        // Keep answers UI aligned after question edits
        loadAnswersFromInstance(updatedInstance);
        setDraftQuestions(deepCopy(updatedInstance.questions || []));
      }

      setEditingInstance(false);
    } catch (err) {
      console.error("Failed to save project version:", err);
      setError(err.message || "Failed to save project version");
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
   * Draft editing helpers (Designer)
   * ========================================================= */

  // Update draft question text (project-only)
  function updateDraftQuestionText(qIndex, value) {
    setDraftQuestions((prev) => {
      const copy = deepCopy(prev);
      copy[qIndex].text = value;
      return copy;
    });
  }

  // Update draft option text (project-only)
  function updateDraftOptionText(qIndex, optIndex, value) {
    setDraftQuestions((prev) => {
      const copy = deepCopy(prev);
      copy[qIndex].options[optIndex].text = value;
      return copy;
    });
  }

  // Update draft option imageUrl (project-only)
  function updateDraftOptionImageUrl(qIndex, optIndex, value) {
    setDraftQuestions((prev) => {
      const copy = deepCopy(prev);
      copy[qIndex].options[optIndex].imageUrl = value;
      return copy;
    });
  }

  // Add a new draft question (project-only)
  function addDraftQuestion() {
    setDraftQuestions((prev) => [...prev, { text: "", multiple: true, options: [] }]);
  }

  // Remove a draft question (project-only)
  function removeDraftQuestion(qIndex) {
    setDraftQuestions((prev) => prev.filter((_, i) => i !== qIndex));
  }

  // Add a new draft option to a draft question (project-only)
  function addDraftOption(qIndex) {
    setDraftQuestions((prev) => {
      const copy = deepCopy(prev);
      copy[qIndex].options = copy[qIndex].options || [];
      copy[qIndex].options.push({ text: "", imageUrl: "" });
      return copy;
    });
  }

  // Remove a draft option (project-only)
  function removeDraftOption(qIndex, optIndex) {
    setDraftQuestions((prev) => {
      const copy = deepCopy(prev);
      copy[qIndex].options = (copy[qIndex].options || []).filter((_, i) => i !== optIndex);
      return copy;
    });
  }

  // Upload image and set it into draft option (project-only)
  async function handleDraftOptionImageUpload(qIndex, optIndex, file) {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("image", file);

      const { imageUrl } = await uploadImage(formData);
      updateDraftOptionImageUrl(qIndex, optIndex, imageUrl);
    } catch (err) {
      setError(err.message || "Failed to upload image");
    }
  }

  /* =========================================================
   * Derived data (current instance + questions to render)
   * ========================================================= */

  // List of assigned questionnaire instances in project
  const assignedInstances = useMemo(() => {
    return Array.isArray(project?.designQuestionnaires)
      ? project.designQuestionnaires
      : [];
  }, [project]);

  // Current selected instance object
  const currentInstance = useMemo(() => {
    return (
      assignedInstances.find((q) => String(q._id) === String(selectedInstanceId)) ||
      assignedInstances[0] ||
      null
    );
  }, [assignedInstances, selectedInstanceId]);

  // Questions shown on screen (draft in edit mode, otherwise instance)
  const questionsToRender = useMemo(() => {
    if (isDesigner && editingInstance) return draftQuestions;
    return currentInstance?.questions || [];
  }, [isDesigner, editingInstance, draftQuestions, currentInstance]);

  /* =========================================================
   * Styles
   * ========================================================= */

  const pageStyle = {
    minHeight: "100vh",
    padding: "40px 16px 60px",
    display: "flex",
    justifyContent: "center",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: 1100,
    background: "rgba(255, 255, 255, 0.94)",
    borderRadius: 18,
    padding: "28px 32px 32px",
    boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,192,203,0.7)",
    position: "relative",
  };

  const sectionTitleStyle = {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 10,
    marginTop: 24,
  };

  const optionCardStyle = {
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #ddd",
    cursor: "pointer",
    background: "#fff",
  };

  const optionImgStyle = {
    display: "block",
    width: "100%",
    height: 200,
    objectFit: "cover",
  };

  const modalOverlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  };

  const labelStyleBack = {
    padding: "8px 16px",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    backgroundColor: "#f3f3f3",
    color: "#333333",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    width: "130px",
    textAlign: "center",
    textDecoration: "none",
  };

  /* =========================================================
   * Render
   * ========================================================= */

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Link to={`/project/${projectId}/menu`} style={labelStyleBack}>
            Back to Project
          </Link>
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 8 }}>
          Project Questionnaire
        </h1>

        <p style={{ marginBottom: 12, fontSize: 14 }}>
          Answer the questionnaire for this project.
          {isDesigner ? " You can also customize it for this project only." : ""}
        </p>

        <div
          style={{
            background: "rgba(255,255,255,0.9)",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #eee",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          <strong>Project:</strong> {project?.name || "—"}{" "}
          <span style={{ marginLeft: 12 }}>
            <strong>Client:</strong> {project?.clientUsername || "—"}
          </span>

          <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
            {assignedInstances.length === 0
              ? "No questionnaires have been assigned to this project yet."
              : `There are ${assignedInstances.length} questionnaires assigned to this project.`}
          </div>
        </div>

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

        {loading ? (
          <p>Loading questionnaire...</p>
        ) : (
          <>
            {/* Designer: assign template */}
            {isDesigner && (
              <section>
                <h2 style={sectionTitleStyle}>Add or update a template in this project</h2>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={selectedTemplateId}
                    onChange={handleDesignerTemplateSelect}
                    style={{ padding: "6px 8px", minWidth: 260 }}
                  >
                    <option value="">-- choose template --</option>
                    {templates.map((tpl) => (
                      <option key={tpl._id} value={tpl._id}>
                        {tpl.title} {tpl.roomType ? `(${tpl.roomType})` : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedTemplateId || saving}
                    onClick={handleAssignTemplate}
                  >
                    {saving ? "Saving..." : "Add / Update Template"}
                  </button>
                </div>

                <p style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                  This adds the template to this project, or updates it if it already exists.
                </p>
              </section>
            )}

            {/* Choose which instance to view */}
            {assignedInstances.length > 0 && (
              <section style={{ marginTop: 20 }}>
                <h2 style={sectionTitleStyle}>Questionnaire in this project</h2>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={selectedInstanceId}
                    onChange={handleSelectedInstanceChange}
                    style={{ padding: "6px 8px", minWidth: 260 }}
                  >
                    {assignedInstances.map((inst) => (
                      <option key={inst._id} value={String(inst._id)}>
                        {inst.title} {inst.roomType ? `(${inst.roomType})` : ""}
                      </option>
                    ))}
                  </select>

                  {isDesigner && selectedInstanceId && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleRemoveCurrentQuestionnaire}
                    >
                      Remove from project
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Current questionnaire */}
            {currentInstance && (
              <section style={{ marginTop: 30 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                  {currentInstance.title}
                  {currentInstance.roomType ? ` – ${currentInstance.roomType}` : ""}
                </h2>

                <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
                  Choose options and add optional comments.
                </p>

                {/* Designer project-only edit toolbar */}
                {isDesigner && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={toggleProjectEditMode}>
                        {editingInstance
                          ? "Discard project-only edits"
                          : "Customize for this project"}
                      </button>

                      {editingInstance && (
                        <>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={saveProjectVersion}
                          >
                            {saving ? "Saving..." : "Save project-only version"}
                          </button>

                          <button type="button" onClick={addDraftQuestion}>
                            + Add Question
                          </button>
                        </>
                      )}
                    </div>

                    {editingInstance && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                        You are editing a project-only version. This won’t affect the template.
                      </div>
                    )}
                  </div>
                )}

                {/* Questions */}
                {questionsToRender.map((q, idx) => {
                  const qKey = getQuestionKey(q);
                  const selected = answers[qKey]?.selectedOptions || [];
                  const freeText = answers[qKey]?.freeText || "";

                  return (
                    <div
                      key={qKey || idx}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 14,
                        padding: 16,
                        marginBottom: 18,
                        background: "rgba(255,255,255,0.9)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div>
                          <strong>{q.text}</strong>
                          <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>
                            {q.multiple ? "You can choose multiple options" : "Choose one option"}
                          </div>
                        </div>
                      </div>

                      {/* Designer edit controls (draft) */}
                      {isDesigner && editingInstance && (
                        <div style={{ marginTop: 10 }}>
                          <button type="button" onClick={() => removeDraftQuestion(idx)}>
                            Remove question
                          </button>

                          <label style={{ display: "block", marginTop: 10, fontSize: 13 }}>
                            Question text:
                            <input
                              type="text"
                              value={q.text || ""}
                              onChange={(e) => updateDraftQuestionText(idx, e.target.value)}
                              style={{ width: "100%", marginTop: 4 }}
                            />
                          </label>

                          <button type="button" style={{ marginTop: 10 }} onClick={() => addDraftOption(idx)}>
                            + Add option
                          </button>

                          <div style={{ marginTop: 10 }}>
                            <strong style={{ fontSize: 13 }}>Options:</strong>

                            {(q.options || []).map((opt, optIndex) => (
                              <div
                                key={String(opt._id || optIndex)}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "auto 2fr 2fr auto",
                                  gap: 8,
                                  alignItems: "center",
                                  marginTop: 8,
                                }}
                              >
                                <button type="button" onClick={() => removeDraftOption(idx, optIndex)}>
                                  Remove
                                </button>

                                <input
                                  type="text"
                                  value={opt.text || ""}
                                  placeholder="Option text"
                                  onChange={(e) => updateDraftOptionText(idx, optIndex, e.target.value)}
                                />

                                <input
                                  type="text"
                                  value={opt.imageUrl || ""}
                                  placeholder="Image URL"
                                  onChange={(e) => updateDraftOptionImageUrl(idx, optIndex, e.target.value)}
                                />

                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleDraftOptionImageUpload(
                                      idx,
                                      optIndex,
                                      e.target.files?.[0]
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Options cards */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
                          gap: 12,
                        }}
                      >
                        {(q.options || []).map((opt, optIndex) => {
                          const optKey = getOptionKey(opt);
                          const isSelected = selected.includes(optKey);

                          return (
                            <div
                              key={String(opt._id || optIndex)}
                              style={{
                                ...optionCardStyle,
                                border: isSelected ? "2px solid #ff7fa2" : "1px solid #ddd",
                              }}
                              onClick={() => {
                                if (isDesigner && editingInstance) return;
                                toggleOption(qKey, optKey, q.multiple);
                              }}
                            >
                              {opt.imageUrl && (
                                <img
                                  src={opt.imageUrl}
                                  alt={opt.text}
                                  style={optionImgStyle}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalImage(opt.imageUrl);
                                  }}
                                />
                              )}
                              <div style={{ padding: "6px 8px", fontSize: 13, textAlign: "center" }}>
                                {opt.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Free text */}
                      <div style={{ marginTop: 10 }}>
                        <label style={{ fontSize: 13 }}>
                          Extra comments (optional):
                          <textarea
                            rows={2}
                            style={{ width: "100%", marginTop: 4 }}
                            value={freeText}
                            onChange={(e) => handleFreeTextChange(qKey, e.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}

                {/* Save answers */}
                <button
                  type="button"
                  onClick={saveAllAnswers}
                  disabled={saving}
                  style={{ marginTop: 12, padding: "10px 16px", borderRadius: 14 }}
                >
                  {saving ? "Saving..." : "Save My Answers"}
                </button>

                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                  This saves the selected options and comments for this project.
                </div>
              </section>
            )}
          </>
        )}

        {/* Image modal */}
        {modalImage && (
          <div style={modalOverlayStyle} onClick={() => setModalImage(null)}>
            <img
              src={modalImage}
              alt="Preview"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                borderRadius: 16,
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
