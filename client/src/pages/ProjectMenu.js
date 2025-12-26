// client/src/pages/ProjectMenu.js

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchProjectById } from "../api";

/**
 * ProjectMenu
 *
 * Central hub for a single project.
 * - Loads the project by id from the URL.
 * - Shows a short summary (name, client, dates, budget).
 * - Provides navigation to sub-pages:
 *   - Workers management
 *   - Suppliers management
 *   - Project plan
 *   - Client questionnaire
 *   - Color & material selection
 */

export default function ProjectMenu() {
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Read the current role from localStorage to know where "Back" should go
  const role = localStorage.getItem("role") || "client";
  const backHref = role === "designer" ? "/designer" : "/client";

  /* -------------------------------------------------
   * Load project details
   * ------------------------------------------------- */
  useEffect(() => {
    async function loadProject() {
      if (!projectId) return;

      setLoading(true);
      setError("");

      try {
        const data = await fetchProjectById(projectId);
        setProject(data);
      } catch (err) {
        console.error("Failed to load project:", err);
        setError(err.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId]);

  /* -------------------------------------------------
   * Styles
   * ------------------------------------------------- */
  const pageStyle = {
    minHeight: "100vh",
    padding: "40px 16px 60px",
    display: "flex",
    justifyContent: "center",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: 900,
    background: "rgba(255, 255, 255, 0.92)",
    borderRadius: 18,
    padding: "28px 32px 32px",
    boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,192,203,0.7)",
    position: "relative",
  };

  const titleStyle = {
    fontSize: "30px",
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  };

  const subStyle = {
    textAlign: "center",
    fontSize: 14,
    color: "#555",
    marginBottom: 24,
  };

  const backLinkStyle = {
    position: "absolute",
    right: 24,
    top: 20,
    fontSize: 14,
    textDecoration: "none",
    color: "#1e88e5",
  };

  const summaryRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 24,
    marginBottom: 28,
    fontSize: 14,
  };

  const summaryItemStyle = {
    minWidth: 160,
    textAlign: "center",
  };

  const labelStyle = {
    fontWeight: 600,
    display: "block",
    marginBottom: 4,
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
    width:"130px",
  };

  const valueStyle = { color: "#444" };

  const menuContainerStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    alignItems: "center",
  };

  const menuButtonStyle = {
    display: "block",
    width: "100%",
    maxWidth: 360,
    padding: "12px 18px",
    textAlign: "center",
    borderRadius: 16,
    border: "1px solid rgba(255,192,203,0.9)",
    background: "linear-gradient(90deg,#ffd1dc,#ff9eb5)",
    color: "#222",
    fontWeight: 600,
    textDecoration: "none",
    fontSize: 15,
    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
  };

  /* -------------------------------------------------
   * Render
   * ------------------------------------------------- */
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <Link to={`/designer`} style={labelStyleBack}>Back to Dashbord</Link>
      </div>
        <h1 style={titleStyle}>Project Menu</h1>
        <p style={subStyle}>
          Manage all aspects of this interior design project from here.
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
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {loading || !project ? (
          <p style={{ textAlign: "center" }}>Loading project...</p>
        ) : (
          <>
            {/* Project summary */}
            <div style={summaryRowStyle}>
              <div style={summaryItemStyle}>
                <span style={labelStyle}>Project</span>
                <span style={valueStyle}>{project.name}</span>
              </div>
              <div style={summaryItemStyle}>
                <span style={labelStyle}>Client</span>
                <span style={valueStyle}>{project.clientUsername}</span>
              </div>
              <div style={summaryItemStyle}>
                <span style={labelStyle}>Dates</span>
                <span style={valueStyle}>
                  {project.startDate?.slice(0, 10)} →{" "}
                  {project.endDate?.slice(0, 10)}
                </span>
              </div>
              <div style={summaryItemStyle}>
                <span style={labelStyle}>Budget</span>
                <span style={valueStyle}>
                  {project.budget != null ? `${project.budget} ₪` : "-"}
                </span>
              </div>
            </div>

            {/* Navigation buttons to sub-pages */}
            <div style={menuContainerStyle}>
              <Link
                to={`/project/${projectId}/workers`}
                style={menuButtonStyle}
              >
                Manage / View Workers
              </Link>

              <Link
                to={`/project/${projectId}/suppliers`}
                style={menuButtonStyle}
              >
                Manage / View Suppliers
              </Link>

              <Link to={`/project/${projectId}/plan`} style={menuButtonStyle}>
                Project Plan
              </Link>

              <Link
                to={`/project/${projectId}/questionnaire`}
                style={menuButtonStyle}
              >
                Client Questionnaire
              </Link>

              <Link
                to={`/project/${projectId}/colors`}
                style={menuButtonStyle}
              >
                Color &amp; Material Selection
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
