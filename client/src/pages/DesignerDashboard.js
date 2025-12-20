// client/src/pages/DesignerDashboard.js

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DesignerNav from "../components/DesignerNav";
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../api";

/**
 * DesignerDashboard
 *
 * Main dashboard for the designer (organizer).
 * Features:
 * - Create / edit / delete projects.
 * - List all projects created by the designer.
 * - Quick navigation to workers, suppliers, and project plan pages.
 */
export default function DesignerDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form + state for create / edit
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    budget: "",
    clientUsername: "",
  });

  const navigate = useNavigate();

  /* ---------- Load projects on mount ---------- */

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        // Backend returns only projects for the current designer
        const data = await fetchProjects();
        const normalized = Array.isArray(data) ? data : data.projects || [];
        setProjects(normalized);
      } catch (err) {
        console.error("Failed to load projects:", err);
        setError(err.message || "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* ---------- Create / Update project ---------- */

  function handleCreateChange(e) {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  }

  /**
   * Create a new project or update an existing one, depending on `editingId`.
   * Uses API helper functions from ../api for a clean separation.
   */
  async function handleCreateOrUpdateProject(e) {
    e.preventDefault();
    setCreating(true);
    setError("");

    const body = {
      name: createForm.name,
      startDate: createForm.startDate || null,
      endDate: createForm.endDate || null,
      budget: createForm.budget ? Number(createForm.budget) : null,
      clientUsername: createForm.clientUsername,
    };

    try {
      if (editingId) {
        // Update existing project
        const res = await updateProject(editingId, body);
        const updated = res.project || res;

        setProjects((prev) =>
          prev.map((p) => (p._id === updated._id ? updated : p))
        );
      } else {
        // Create new project
        const res = await createProject(body);
        const newProject = res.project || res;

        setProjects((prev) => [...prev, newProject]);
      }

      // Clear form after successful save
      setCreateForm({
        name: "",
        startDate: "",
        endDate: "",
        budget: "",
        clientUsername: "",
      });
      setEditingId(null);
    } catch (err) {
      console.error("Create/update project error:", err);
      setError(err.message || "Failed to save project");
    } finally {
      setCreating(false);
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setCreateForm({
      name: "",
      startDate: "",
      endDate: "",
      budget: "",
      clientUsername: "",
    });
  }

  /* ---------- Delete / Edit / Open screens ---------- */

  async function handleDelete(projectId) {
    if (!window.confirm("Are you sure you want to delete this project?")) {
      return;
    }

    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p._id !== projectId));
    } catch (err) {
      console.error("Delete project error:", err);
      alert(err.message || "Failed to delete project");
    }
  }

  /**
   * Edit:
   * Fills the form at the top with the project data
   * so the user can update it.
   */
  function handleEdit(project) {
    setEditingId(project._id);
    setCreateForm({
      name: project.name || "",
      clientUsername: project.clientUsername || "",
      startDate: project.startDate ? project.startDate.slice(0, 10) : "",
      endDate: project.endDate ? project.endDate.slice(0, 10) : "",
      budget:
        project.budget !== null && project.budget !== undefined
          ? String(project.budget)
          : "",
    });
    // Optional: scroll into view
    // window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Open project menu (workers / suppliers / plan, etc.)
  function handleOpenMenu(projectId) {
    navigate(`/project/${projectId}/menu`);
  }

  /* ---------- Styles (simple inline for now) ---------- */

  const pageStyle = {
    minHeight: "100vh",
    padding: "40px 16px 60px",
    display: "flex",
    justifyContent: "center",
  };

  // Left: navigation, Right: content
  const layoutStyle = {
    width: "100%",
    maxWidth: 1150,
    display: "grid",
    gridTemplateColumns: "260px auto",
    gap: 24,
  };

  const cardStyle = {
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: 18,
    padding: "24px 28px 30px",
    boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,192,203,0.7)",
    width: "100%",
  };

  const titleStyle = {
    fontSize: 30,
    fontWeight: 700,
    marginBottom: 6,
  };

  const subStyle = {
    fontSize: 14,
    color: "#555",
    marginBottom: 22,
  };

  const smallLabelStyle = { fontSize: 12, color: "#777" };

  const tableWrapperStyle = {
    marginTop: 12,
    overflowX: "auto",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  };

  const thStyle = {
    textAlign: "left",
    padding: "8px 10px",
    borderBottom: "2px solid #f0b6c4",
    background: "rgba(255,240,244,0.8)",
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    padding: "7px 10px",
    borderBottom: "1px solid #f2f2f2",
    verticalAlign: "top",
  };

  const actionsCellStyle = {
    ...tdStyle,
    whiteSpace: "nowrap",
  };

  const primaryButtonStyle = {
    padding: "6px 10px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    background: "#ff9eb5",
  };

  const secondaryButtonStyle = {
    ...primaryButtonStyle,
    background: "#eee",
    marginLeft: 6,
  };

  const linkButtonStyle = {
    ...primaryButtonStyle,
    background: "transparent",
    border: "1px solid rgba(255,192,203,0.9)",
  };

  const inputStyle = {
    width: "100%",
    fontSize: 13,
    padding: "4px 6px",
    boxSizing: "border-box",
  };

  // Clickable project name (opens menu)
  const projectNameButtonStyle = {
    border: "none",
    background: "transparent",
    color: "#1e88e5",
    cursor: "pointer",
    padding: 0,
    fontSize: 13,
    textDecoration: "underline",
  };

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        {/* Left side navigation – "Projects" tab is active */}
        <DesignerNav active="projects" />

        {/* Main content – right side */}
        <main style={cardStyle}>
          <h1 style={titleStyle}>Designer Dashboard</h1>
          <p style={subStyle}>
            Manage interior design projects for your clients.
          </p>

          {/* Error banner */}
          {error && (
            <div
              style={{
                marginBottom: 14,
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

          {/* Create / edit project form */}
          <section style={{ marginBottom: 20 }}>
            <div style={{ ...smallLabelStyle, marginBottom: 6 }}>
              {editingId ? "Edit Project" : "Create New Project"}
            </div>
            <form
              onSubmit={handleCreateOrUpdateProject}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto auto",
                gap: 8,
                alignItems: "end",
              }}
            >
              <div>
                <label style={smallLabelStyle}>Project Name:</label>
                <input
                  type="text"
                  name="name"
                  value={createForm.name}
                  onChange={handleCreateChange}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={smallLabelStyle}>Client Username:</label>
                <input
                  type="text"
                  name="clientUsername"
                  value={createForm.clientUsername}
                  onChange={handleCreateChange}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={smallLabelStyle}>Start Date:</label>
                <input
                  type="date"
                  name="startDate"
                  value={createForm.startDate}
                  onChange={handleCreateChange}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={smallLabelStyle}>End Date:</label>
                <input
                  type="date"
                  name="endDate"
                  value={createForm.endDate}
                  onChange={handleCreateChange}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={smallLabelStyle}>Budget:</label>
                <input
                  type="number"
                  name="budget"
                  value={createForm.budget}
                  onChange={handleCreateChange}
                  min="0"
                  style={inputStyle}
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={creating}
                  style={primaryButtonStyle}
                >
                  {creating
                    ? editingId
                      ? "Saving..."
                      : "Creating..."
                    : editingId
                    ? "Save Changes"
                    : "Create Project"}
                </button>
              </div>
              {editingId && (
                <div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    style={secondaryButtonStyle}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* Projects list */}
          <section>
            <div style={{ ...smallLabelStyle, marginBottom: 6 }}>
              Your Projects
            </div>

            {loading ? (
              <p>Loading projects...</p>
            ) : projects.length === 0 ? (
              <p style={{ fontSize: 14, color: "#666" }}>
                You don&apos;t have any projects yet.
              </p>
            ) : (
              <div style={tableWrapperStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Client</th>
                      <th style={thStyle}>Start</th>
                      <th style={thStyle}>End</th>
                      <th style={thStyle}>Budget</th>
                      <th style={thStyle}>Workers</th>
                      <th style={thStyle}>Suppliers</th>
                      <th style={thStyle}>Actions</th>
                      <th style={thStyle}>Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p._id}>
                        <td style={tdStyle}>
                          {/* Clickable project name → opens project menu */}
                          <button
                            type="button"
                            style={projectNameButtonStyle}
                            onClick={() => handleOpenMenu(p._id)}
                          >
                            {p.name}
                          </button>
                        </td>
                        <td style={tdStyle}>{p.clientUsername}</td>
                        <td style={tdStyle}>
                          {p.startDate ? p.startDate.slice(0, 10) : "-"}
                        </td>
                        <td style={tdStyle}>
                          {p.endDate ? p.endDate.slice(0, 10) : "-"}
                        </td>
                        <td style={tdStyle}>
                          {p.budget != null ? `${p.budget} ₪` : "-"}
                        </td>
                        <td style={tdStyle}>
                          {(p.workers || [])
                            .map(
                              (w) =>
                                `${w.workerName || ""}${
                                  w.role ? `, ${w.role}` : ""
                                }`
                            )
                            .join(" | ") || "-"}
                        </td>
                        <td style={tdStyle}>
                          {(p.suppliers || [])
                            .map(
                              (s) =>
                                `${s.storeName || ""}${
                                  s.product ? `, ${s.product}` : ""
                                }`
                            )
                            .join(" | ") || "-"}
                        </td>
                        <td style={actionsCellStyle}>
                          <button
                            type="button"
                            style={primaryButtonStyle}
                            onClick={() => handleEdit(p)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            style={secondaryButtonStyle}
                            onClick={() => handleDelete(p._id)}
                          >
                            Delete
                          </button>
                        </td>
                        <td style={actionsCellStyle}>
                          {/* Open Plan – design plan page */}
                          <Link
                            to={`/project/${p._id}/plan`}
                            style={linkButtonStyle}
                          >
                            Open Plan
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
