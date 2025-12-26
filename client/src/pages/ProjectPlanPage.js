// client/src/pages/ProjectPlanPage.js

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchProjectById, updateProjectPlan } from "../api";

/**
 * ProjectPlanPage
 *
 * This page shows the high-level design plan and notes for a single project,
 * plus a simple cost summary based on workers and suppliers.
 *
 * - Both designer and client can view the plan and cost summary.
 * - Only the designer can edit and save the plan / notes.
 */

export default function ProjectPlanPage() {
  const { projectId } = useParams();

  // Full project document loaded from the backend
  const [project, setProject] = useState(null);

  // Text fields for design plan and notes
  const [designPlan, setDesignPlan] = useState("");
  const [notes, setNotes] = useState("");

  // Calculated summary fields
  const [totalWorkersCost, setTotalWorkersCost] = useState(0);
  const [totalSuppliersCost, setTotalSuppliersCost] = useState(0);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Role-based permissions
  const role = localStorage.getItem("role");
  const isDesigner = role === "designer";

  /* -------------------------------------------------
   * Load project + initialize plan/notes/costs
   * ------------------------------------------------- */
  async function loadProject() {
    if (!projectId) return;

    setError("");

    try {
      const data = await fetchProjectById(projectId);

      setProject(data || null);
      setDesignPlan(data?.designPlan || "");
      setNotes(data?.notes || "");

      // Calculate workers & suppliers totals from the project data
      const workersCost = (data?.workers || []).reduce(
        (sum, w) => sum + (Number(w.cost) || 0),
        0
      );
      const suppliersCost = (data?.suppliers || []).reduce(
        (sum, s) => sum + (Number(s.price) || 0),
        0
      );

      setTotalWorkersCost(workersCost);
      setTotalSuppliersCost(suppliersCost);
    } catch (err) {
      console.error("Failed to load project:", err);
      setError(err.message || "Failed to load project");
    }
  }

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /* -------------------------------------------------
   * Recalculate totals manually (if project changed)
   * ------------------------------------------------- */
  function calculateTotals() {
    if (!project) return;

    const workersCost = (project.workers || []).reduce(
      (sum, w) => sum + (Number(w.cost) || 0),
      0
    );
    const suppliersCost = (project.suppliers || []).reduce(
      (sum, s) => sum + (Number(s.price) || 0),
      0
    );

    setTotalWorkersCost(workersCost);
    setTotalSuppliersCost(suppliersCost);
  }

  /* -------------------------------------------------
   * Save plan & notes (designer only)
   * ------------------------------------------------- */
  async function handleSavePlan() {
    if (!isDesigner) return; // safety: client cannot save

    setSaving(true);
    setError("");

    try {
      await updateProjectPlan(projectId, { designPlan, notes });

      // Reload project to be sure we see the updated version
      await loadProject();
    } catch (err) {
      console.error("Failed to save plan:", err);
      setError(err.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------
   * Derived values: total & remaining budget
   * ------------------------------------------------- */
  const totalProjectCost = totalWorkersCost + totalSuppliersCost;
  const budget = Number(project?.budget || 0);
  const remaining = budget - totalProjectCost;

  /* -------------------------------------------------
   * Styles (inline for now, can be moved to CSS later)
   * ------------------------------------------------- */
  const pageStyle = {
    maxWidth: 1100,
    margin: "40px auto",
    padding: "0 16px",
  };

  const headerRowStyle = {
    marginBottom: 16,
  };

  const projectInfoStyle = {
    marginBottom: 16,
    fontSize: 14,
  };

  const errorStyle = {
    color: "red",
    marginBottom: 16,
  };

  const textareaStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const sectionStyle = {
    marginBottom: 32,
  };

  const costHighlightStyle = {
    fontWeight: 700,
  };

  const remainingStyle = {
    color: remaining < 0 ? "red" : "green",
  };

  const buttonStyle = {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,192,203,0.9)",
    background: "linear-gradient(90deg,#ffd1dc,#ff9eb5)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: "#eee",
    border: "1px solid #ccc",
  };
  const labelStyleBack = { 
    padding: "8px 16px",
    borderRadius:"999px",
    border:"none",
    cursor:"pointer",
    fontWeight: 600,
    backgroundColor: "#f3f3f3",
    color: "#333333",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    width:"110px",
  };
  /* -------------------------------------------------
   * Render
   * ------------------------------------------------- */
  return (
    <div style={pageStyle}>
      <h1>Project Plan</h1>

      <div style={headerRowStyle}>
        <div style={{display:"flex",justifyContent:"flex-end"}}>
           <Link to={`/project/${projectId}/menu`} style={labelStyleBack}>Back to Project</Link>
        </div>
      </div>    
      {project && (
        <p style={projectInfoStyle}>
          <strong>Project:</strong> {project.name}{" "}
          <span style={{ marginLeft: 8 }}>
            <strong>Client:</strong> {project.clientUsername}
          </span>
        </p>
      )}

      {error && <div style={errorStyle}>{error}</div>}

      {/* Design Plan / Notes section */}
      <section style={sectionStyle}>
        <h2>Design Plan</h2>
        <textarea
          value={designPlan}
          onChange={(e) => isDesigner && setDesignPlan(e.target.value)}
          placeholder="Enter the detailed design plan here..."
          rows={8}
          style={textareaStyle}
          readOnly={!isDesigner}
        />

        <h2 style={{ marginTop: 24 }}>Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => isDesigner && setNotes(e.target.value)}
          placeholder="Add any additional notes or comments..."
          rows={5}
          style={textareaStyle}
          readOnly={!isDesigner}
        />
      </section>

      {/* Cost summary section */}
      <section style={sectionStyle}>
        <h2>Cost Summary</h2>
        <p>Total cost of suppliers: {totalSuppliersCost} ₪</p>
        <p>Total cost of workers: {totalWorkersCost} ₪</p>
        <p>
          <span style={costHighlightStyle}>
            Total project cost: {totalProjectCost} ₪
          </span>
        </p>
        <p>Project budget: {budget} ₪</p>
        <p>
          Remaining budget:{" "}
          <span style={remainingStyle}>{remaining} ₪</span>
        </p>

        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={calculateTotals}
            style={secondaryButtonStyle}
          >
            Recalculate Total Costs
          </button>

          {/* Save button – visible only to designer */}
          {isDesigner && (
            <button
              type="button"
              onClick={handleSavePlan}
              disabled={saving}
              style={{ ...buttonStyle, marginLeft: 8 }}
            >
              {saving ? "Saving..." : "Save Plan"}
            </button>
          )}
        </div>

        {!isDesigner && (
          <p style={{ marginTop: 8, fontStyle: "italic", fontSize: 13 }}>
            You can view the plan and notes. Changes can be made by your
            designer only.
          </p>
        )}
      </section>
    </div>
  );
}
