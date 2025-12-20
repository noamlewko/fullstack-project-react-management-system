// src/pages/ProjectQuestionnairesPage.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../api";

export default function ProjectQuestionnairesPage() {
  const { projectId } = useParams();
  const role = localStorage.getItem("role") || "client";

  const [project, setProject] = useState(null);

  // כל תבניות השאלון שהמעצבת יצרה במערכת (לשימוש המעצבת בלבד)
  const [templates, setTemplates] = useState([]);

  // תבנית שנבחרה ע"י המעצבת להוספה/עדכון לפרויקט
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // איזה instance של שאלון משויך לפרויקט כרגע מוצג (id של השאלון בפרויקט)
  const [selectedInstanceId, setSelectedInstanceId] = useState("");

  // התשובות שהמשתמש ממלא כרגע בטופס על המסך
  // { [questionId]: { selectedOptions: [optionId, ...], freeText: "" } }
  const [answers, setAnswers] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modalImage, setModalImage] = useState(null);

  // -------------------------------------------------
  // טעינת פרויקט + תבניות (אם מעצבת)
  // -------------------------------------------------
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError("");

      try {
        // 1. נטען את הפרויקט + השאלונים שכבר משויכים אליו
        const proj = await apiFetch(`/api/projects/${projectId}`);
        setProject(proj);

        const assigned = Array.isArray(proj.designQuestionnaires)
          ? proj.designQuestionnaires
          : [];

        // אם יש כבר שאלונים משויכים – נתחיל מהראשון
        if (assigned.length > 0) {
          setSelectedInstanceId(String(assigned[0]._id));
          loadAnswersFromInstance(assigned[0]);
        } else {
          setSelectedInstanceId("");
          setAnswers({});
        }

        // 2. אם המשתמשת היא מעצבת – נטען את רשימת כל התבניות שלה
        if (role === "designer") {
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

    if (projectId) {
      loadAll();
    }
  }, [projectId, role]);

  // -------------------------------------------------
  // טעינת תשובות instance קיים לתוך ה־state
  // -------------------------------------------------
  function loadAnswersFromInstance(instance) {
    if (!instance || !Array.isArray(instance.answers)) {
      setAnswers({});
      return;
    }

    const map = {};
    instance.answers.forEach((a) => {
      const qId = String(a.questionId || "");
      if (!qId) return;

      map[qId] = {
        selectedOptions: Array.isArray(a.selectedOptions)
          ? a.selectedOptions.map((opt) => String(opt.optionId))
          : [],
        freeText: a.freeText || "",
      };
    });

    setAnswers(map);
  }

  // -------------------------------------------------
  // בחירת איזה שאלון משויך יוצג כרגע (instance מתוך הפרויקט)
  // -------------------------------------------------
  function handleSelectedInstanceChange(e) {
    const newInstanceId = e.target.value;
    setSelectedInstanceId(newInstanceId);

    if (!project || !Array.isArray(project.designQuestionnaires)) {
      setAnswers({});
      return;
    }

    const instance = project.designQuestionnaires.find(
      (q) => String(q._id) === String(newInstanceId)
    );

    loadAnswersFromInstance(instance);
  }

  // -------------------------------------------------
  // בחירת תבנית ע"י המעצבת (כשמוסיפים/מעדכנים לפרויקט)
  // -------------------------------------------------
  function handleDesignerTemplateSelect(e) {
    setSelectedTemplateId(e.target.value);
  }

  // המעצבת משייכת / מעדכנת תבנית לפרויקט
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

      // נמצא את ה-instance של התבנית ששויכה/עודכנה עכשיו
      const instance = assigned.find(
        (q) => String(q.templateId) === String(selectedTemplateId)
      );

      if (instance) {
        setSelectedInstanceId(String(instance._id));
        loadAnswersFromInstance(instance);
      }
    } catch (err) {
      console.error("Error assigning template:", err);
      setError(err.message || "Failed to assign questionnaire");
    } finally {
      setSaving(false);
    }
  }

  // מחיקת כל השאלונים מהפרויקט (אם תרצי כפתור לזה)
  async function handleClearAllQuestionnaires() {
    if (!projectId) return;
    setSaving(true);
    setError("");

    try {
      const res = await apiFetch(
        `/api/projects/${projectId}/questionnaire/assign`,
        {
          method: "POST",
          body: JSON.stringify({ templateId: "" }), // שולחים ריק
        }
      );

      const updatedProject = res.project || res;
      setProject(updatedProject);
      setSelectedInstanceId("");
      setAnswers({});
    } catch (err) {
      console.error("Error clearing questionnaires:", err);
      setError(err.message || "Failed to clear questionnaire");
    } finally {
      setSaving(false);
    }
  }

  // מחיקת השאלון הנוכחי בלבד מהפרויקט
  async function handleRemoveCurrentQuestionnaire() {
    if (!projectId || !selectedInstanceId) return;

    if (
      !window.confirm(
        "Remove this questionnaire from this project? (Client will no longer see it.)"
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await apiFetch(
        `/api/projects/${projectId}/questionnaires/${selectedInstanceId}`,
        {
          method: "DELETE",
        }
      );

      const updatedProject = res.project || res;
      setProject(updatedProject);

      const instances = Array.isArray(updatedProject.designQuestionnaires)
        ? updatedProject.designQuestionnaires
        : [];

      if (instances.length === 0) {
        setSelectedInstanceId("");
        setAnswers({});
      } else {
        const first = instances[0];
        setSelectedInstanceId(String(first._id));
        loadAnswersFromInstance(first);
      }
    } catch (err) {
      console.error("Error removing questionnaire:", err);
      setError(err.message || "Failed to remove questionnaire");
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------
  // עבודה עם תשובות ב־state
  // -------------------------------------------------
  function toggleOption(questionId, optionId, multiple) {
    setAnswers((prev) => {
      const key = String(questionId);
      const existing = prev[key] || { selectedOptions: [], freeText: "" };
      let selected = [...existing.selectedOptions];

      if (multiple) {
        if (selected.includes(optionId)) {
          selected = selected.filter((id) => id !== optionId);
        } else {
          selected.push(optionId);
        }
      } else {
        if (selected.includes(optionId)) {
          selected = [];
        } else {
          selected = [optionId];
        }
      }

      return {
        ...prev,
        [key]: { ...existing, selectedOptions: selected },
      };
    });
  }

  function handleFreeTextChange(questionId, value) {
    setAnswers((prev) => {
      const key = String(questionId);
      const existing = prev[key] || { selectedOptions: [], freeText: "" };
      return {
        ...prev,
        [key]: { ...existing, freeText: value },
      };
    });
  }

  // -------------------------------------------------
  // שמירת כל התשובות לשרת
  // -------------------------------------------------
  async function saveAll() {
    if (!project || !selectedInstanceId) return;

    setSaving(true);
    setError("");

    try {
      const assigned = Array.isArray(project.designQuestionnaires)
        ? project.designQuestionnaires
        : [];

      // instance הנוכחי לפי ה־_id שלו
      const instance = assigned.find(
        (q) => String(q._id) === String(selectedInstanceId)
      );

      if (!instance) {
        setError("No questionnaire instance found for this project");
        setSaving(false);
        return;
      }

      const questions = Array.isArray(instance.questions)
        ? instance.questions
        : [];

      const payloadAnswers = questions.map((q) => {
        const key = String(q._id);
        const entry = answers[key] || {
          selectedOptions: [],
          freeText: "",
        };

        return {
          questionId: q._id,
          questionText: q.text,
          selectedOptions: (q.options || [])
            .filter((opt) =>
              entry.selectedOptions.includes(String(opt._id))
            )
            .map((opt) => ({
              optionId: opt._id,
              name: opt.text,
              imageUrl: opt.imageUrl || "",
            })),
          freeText: entry.freeText || "",
        };
      });

      const res = await apiFetch(
        `/api/projects/${projectId}/questionnaire/answers`,
        {
          method: "POST",
          body: JSON.stringify({
            templateId: instance.templateId, // חשוב – השרת משתמש בזה כדי לעדכן את ה-instance הנכון
            answers: payloadAnswers,
          }),
        }
      );

      const updatedProject = res.project || res;
      setProject(updatedProject);

      // נטען מחדש את התשובות העדכניות מהשרת
      const updatedInstance = (updatedProject.designQuestionnaires || []).find(
        (q) => String(q._id) === String(selectedInstanceId)
      );
      if (updatedInstance) {
        loadAnswersFromInstance(updatedInstance);
      }
    } catch (err) {
      console.error("Error saving questionnaire:", err);
      setError(err.message || "Failed to save questionnaire");
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------
  // עזר להצגת השאלון הנוכחי על המסך
  // -------------------------------------------------
  const assignedInstances = Array.isArray(project?.designQuestionnaires)
    ? project.designQuestionnaires
    : [];

  const currentInstance =
    assignedInstances.find(
      (q) => String(q._id) === String(selectedInstanceId)
    ) || assignedInstances[0] || null;

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

  const backLinkStyle = {
    position: "absolute",
    right: 24,
    top: 20,
    fontSize: 14,
    textDecoration: "none",
    color: "#1e88e5",
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

  // -------------------------------------------------
  // Render
  // -------------------------------------------------
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <Link to={`/project/${projectId}`} style={backLinkStyle}>
          ← Back to project
        </Link>

        <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 8 }}>
          Design Questionnaire
        </h1>
        <p style={{ marginBottom: 12, fontSize: 14 }}>
          Preview and fill in the questionnaires linked to this project.
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
            {/* בחירת תבנית מתוך כלל התבניות – רק למעצבת */}
            {role === "designer" && (
              <section>
                <h2 style={sectionTitleStyle}>
                  Select template to add/update on this project
                </h2>

                <div
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <select
                    value={selectedTemplateId}
                    onChange={handleDesignerTemplateSelect}
                    style={{ padding: "6px 8px", minWidth: 260 }}
                  >
                    <option value="">-- choose template --</option>
                    {templates.map((tpl) => (
                      <option key={tpl._id} value={tpl._id}>
                        {tpl.title}{" "}
                        {tpl.roomType ? `(${tpl.roomType})` : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedTemplateId || saving}
                    onClick={handleAssignTemplate}
                  >
                    {saving ? "Saving..." : "Add / update on project"}
                  </button>

                  {/* אופציונלי – מחיקת כל השאלונים מהפרויקט */}
                  {/* <button
                    type="button"
                    disabled={saving || assignedInstances.length === 0}
                    onClick={handleClearAllQuestionnaires}
                  >
                    Clear all questionnaires from project
                  </button> */}
                </div>
              </section>
            )}

            {/* בחירת איזה שאלון משויך יוצג כרגע (מעצבת + לקוח) */}
            {assignedInstances.length > 0 && (
              <section style={{ marginTop: 20 }}>
                <h2 style={sectionTitleStyle}>
                  Questionnaire for this project
                </h2>

                <div
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <select
                    value={selectedInstanceId}
                    onChange={handleSelectedInstanceChange}
                    style={{ padding: "6px 8px", minWidth: 260 }}
                  >
                    {assignedInstances.map((inst) => (
                      <option key={inst._id} value={String(inst._id)}>
                        {inst.title}{" "}
                        {inst.roomType ? `(${inst.roomType})` : ""}
                      </option>
                    ))}
                  </select>

                  {role === "designer" && selectedInstanceId && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleRemoveCurrentQuestionnaire}
                    >
                      Remove this questionnaire from project
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* אם אין בכלל שאלונים משויכים */}
            {assignedInstances.length === 0 && (
              <p
                style={{ marginTop: 24, fontSize: 14, color: "#666" }}
              >
                Your designer has not assigned any questionnaires to this
                project yet.
              </p>
            )}

            {/* שאלון נוכחי – רק אם יש currentInstance */}
            {currentInstance && (
              <section style={{ marginTop: 30 }}>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {currentInstance.title}
                  {currentInstance.roomType
                    ? ` – ${currentInstance.roomType}`
                    : ""}
                </h2>

                <p
                  style={{
                    fontSize: 13,
                    color: "#666",
                    marginBottom: 16,
                  }}
                >
                  Please choose the options you like best and add
                  comments if you want.
                </p>

                {(currentInstance.questions || []).map((q, idx) => {
                  const key = String(q._id);
                  const selected = answers[key]?.selectedOptions || [];
                  const freeText = answers[key]?.freeText || "";

                  return (
                    <div
                      key={q._id || idx}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 14,
                        padding: 16,
                        marginBottom: 18,
                        background: "rgba(255,255,255,0.9)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <div>
                          <strong>{q.text}</strong>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#777",
                              marginTop: 2,
                            }}
                          >
                            {q.multiple
                              ? "You can choose multiple options"
                              : "Choose one option"}
                          </div>
                        </div>
                      </div>

                      {/* האופציות כתמונות/כרטיסים */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(220px,1fr))",
                          gap: 12,
                        }}
                      >
                        {(q.options || []).map((opt, optIndex) => {
                          const optId = String(opt._id);
                          const isSelected = selected.includes(optId);
                          return (
                            <div
                              key={opt._id || optIndex}
                              style={{
                                ...optionCardStyle,
                                border: isSelected
                                  ? "2px solid #ff7fa2"
                                  : "1px solid #ddd",
                              }}
                              onClick={() =>
                                toggleOption(q._id, optId, q.multiple)
                              }
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
                              <div
                                style={{
                                  padding: "6px 8px",
                                  fontSize: 13,
                                  textAlign: "center",
                                }}
                              >
                                {opt.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* הערות חופשיות */}
                      <div style={{ marginTop: 10 }}>
                        <label style={{ fontSize: 13 }}>
                          Extra comments (optional):
                          <textarea
                            rows={2}
                            style={{ width: "100%", marginTop: 4 }}
                            value={freeText}
                            onChange={(e) =>
                              handleFreeTextChange(
                                q._id,
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={saveAll}
                  disabled={saving}
                  style={{
                    marginTop: 12,
                    padding: "10px 16px",
                    borderRadius: 14,
                  }}
                >
                  {saving
                    ? "Saving questionnaire..."
                    : "Save questionnaire for this project"}
                </button>
              </section>
            )}
          </>
        )}

        {/* מודאל הגדלת תמונה */}
        {modalImage && (
          <div
            style={modalOverlayStyle}
            onClick={() => setModalImage(null)}
          >
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
