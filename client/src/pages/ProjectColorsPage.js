// client/src/pages/ProjectColorsPage.js

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchProjectById,
  updateProjectColorSelections,
} from "../api";

/**
 * ProjectColorsPage
 *
 * Per-project color & material configuration.
 * - Loads a specific project (by projectId from the URL).
 * - Manages a list of room/area selections (color + material per room).
 * - Allows adding, editing, deleting rooms locally.
 * - Saves the entire list to the project (MongoDB) by PUT /api/projects/:id.
 */

export default function ProjectColorsPage() {
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // List of rooms/areas and their selections in this project
  const [selections, setSelections] = useState([]);

  // Local form state for adding/editing a single room
  const [roomName, setRoomName] = useState("");
  const [wallColor, setWallColor] = useState("#ffffff");
  const [furnitureColor, setFurnitureColor] = useState("#ffffff");
  const [floorColor, setFloorColor] = useState("#ffffff");
  const [materialType, setMaterialType] = useState("wood");
  const [finishType, setFinishType] = useState("matte");

  // Index of the currently edited item in `selections` (-1 means "add new")
  const [editingIndex, setEditingIndex] = useState(-1);

  /* -------------------------------------------------
   * Load project + color selections
   * ------------------------------------------------- */
  useEffect(() => {
    async function load() {
      if (!projectId) return;

      setLoading(true);
      setError("");

      try {
        const proj = await fetchProjectById(projectId);
        setProject(proj);
        setSelections(
          Array.isArray(proj.colorSelections) ? proj.colorSelections : []
        );
      } catch (err) {
        console.error("Error loading project colors:", err);
        setError(err.message || "Failed to load project colors");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [projectId]);

  /* -------------------------------------------------
   * Helper: reset local form
   * ------------------------------------------------- */
  function resetForm() {
    setRoomName("");
    setWallColor("#ffffff");
    setFurnitureColor("#ffffff");
    setFloorColor("#ffffff");
    setMaterialType("wood");
    setFinishType("matte");
    setEditingIndex(-1);
  }

  /* -------------------------------------------------
   * Add or update a room in the local list
   * ------------------------------------------------- */
  function handleAddOrUpdateRoom() {
    if (!roomName.trim()) {
      alert("Please enter a room / area name");
      return;
    }

    const item = {
      roomName: roomName.trim(),
      wallColor,
      furnitureColor,
      floorColor,
      materialType,
      finishType,
    };

    setSelections((prev) => {
      const list = [...prev];
      if (editingIndex >= 0 && editingIndex < list.length) {
        // Update existing item
        list[editingIndex] = item;
      } else {
        // Add new item
        list.push(item);
      }
      return list;
    });

    resetForm();
  }

  /* -------------------------------------------------
   * Edit / delete a room in the local list
   * ------------------------------------------------- */
  function handleEdit(index) {
    const sel = selections[index];
    if (!sel) return;

    setRoomName(sel.roomName || "");
    setWallColor(sel.wallColor || "#ffffff");
    setFurnitureColor(sel.furnitureColor || "#ffffff");
    setFloorColor(sel.floorColor || "#ffffff");
    setMaterialType(sel.materialType || "wood");
    setFinishType(sel.finishType || "matte");
    setEditingIndex(index);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(index) {
    if (!window.confirm("Delete this room selection?")) return;
    setSelections((prev) => prev.filter((_, i) => i !== index));
  }

  /* -------------------------------------------------
   * Save all selections to the project (server)
   * ------------------------------------------------- */
async function handleSaveAllToProject() {
  if (!projectId) return;

  setSaving(true);
  setError("");

  try {
    const result = await updateProjectColorSelections(projectId, selections);

    // כי השרת מחזיר { project: {...} }
    const updatedProject = result.project || result;

    setProject(updatedProject);
    setSelections(
      Array.isArray(updatedProject.colorSelections)
        ? updatedProject.colorSelections
        : []
    );

    alert("Color & material selections saved to project!");
  } catch (err) {
    console.error("Error saving color selections:", err);
    setError(err.message || "Failed to save color selections");
  } finally {
    setSaving(false);
  }
}


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

  const labelStyle = {
    fontSize: 13,
    fontWeight: 600,
    display: "block",
    marginBottom: 4,
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #ccc",
    fontSize: 13,
    boxSizing: "border-box",
  };

  const colorBoxRow = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    marginTop: 10,
    marginBottom: 16,
  };

  const colorBoxStyle = {
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 12,
    textAlign: "center",
    border: "1px solid #eee",
    minHeight: 50,
  };

  const savedRowStyle = {
    marginTop: 26,
  };

  const savedItemStyle = {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr 1fr 1fr auto",
    gap: 8,
    alignItems: "stretch",
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid #eee",
    marginBottom: 8,
    background: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
  };

  const smallButton = {
    fontSize: 11,
    padding: "4px 8px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    marginLeft: 4,
  };

  /* -------------------------------------------------
   * Render
   * ------------------------------------------------- */
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <Link to={`/project/${projectId}`} style={backLinkStyle}>
          ← Back to project
        </Link>

        <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 8 }}>
          Color & Material Selection
        </h1>
        <p style={{ marginBottom: 12, fontSize: 14 }}>
          Define the color and material language for each room in this project.
        </p>

        {/* Project info header */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.9)",
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
        </div>

        {/* Error banner */}
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
          <p>Loading color selections...</p>
        ) : (
          <>
            {/* Room form section */}
            <section>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
                Add room selection
              </h2>

              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle} htmlFor="roomName">
                  Room / Area name:
                </label>
                <input
                  id="roomName"
                  type="text"
                  placeholder="e.g. Living room, Master bedroom"
                  style={inputStyle}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>
                Colors
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 16,
                  marginTop: 8,
                }}
              >
                <div>
                  <label style={labelStyle} htmlFor="wallColor">
                    Wall color:
                  </label>
                  <input
                    id="wallColor"
                    type="color"
                    style={{ ...inputStyle, padding: 0, height: 36 }}
                    value={wallColor}
                    onChange={(e) => setWallColor(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="furnitureColor">
                    Furniture color:
                  </label>
                  <input
                    id="furnitureColor"
                    type="color"
                    style={{ ...inputStyle, padding: 0, height: 36 }}
                    value={furnitureColor}
                    onChange={(e) => setFurnitureColor(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="floorColor">
                    Floor color:
                  </label>
                  <input
                    id="floorColor"
                    type="color"
                    style={{ ...inputStyle, padding: 0, height: 36 }}
                    value={floorColor}
                    onChange={(e) => setFloorColor(e.target.value)}
                  />
                </div>
              </div>

              {/* Color preview boxes */}
              <div style={colorBoxRow}>
                <div
                  style={{
                    ...colorBoxStyle,
                    backgroundColor: wallColor || "#ffffff",
                  }}
                >
                  Wall
                </div>
                <div
                  style={{
                    ...colorBoxStyle,
                    backgroundColor: furnitureColor || "#ffffff",
                  }}
                >
                  Furniture
                </div>
                <div
                  style={{
                    ...colorBoxStyle,
                    backgroundColor: floorColor || "#ffffff",
                  }}
                >
                  Floor
                </div>
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>
                Materials
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 12,
                }}
              >
                <div>
                  <label style={labelStyle} htmlFor="materialType">
                    Material type:
                  </label>
                  <select
                    id="materialType"
                    style={inputStyle}
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                  >
                    <option value="wood">Wood</option>
                    <option value="metal">Metal</option>
                    <option value="glass">Glass</option>
                    <option value="fabric">Fabric</option>
                    <option value="stone">Stone</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="finishType">
                    Finish type:
                  </label>
                  <select
                    id="finishType"
                    style={inputStyle}
                    value={finishType}
                    onChange={(e) => setFinishType(e.target.value)}
                  >
                    <option value="matte">Matte</option>
                    <option value="glossy">Glossy</option>
                    <option value="satin">Satin</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddOrUpdateRoom}
                style={{
                  padding: "8px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,192,203,0.9)",
                  background: "linear-gradient(90deg,#ffd1dc,#ff9eb5)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {editingIndex >= 0
                  ? "Update room in list"
                  : "Add room to list"}
              </button>
            </section>

            {/* Saved rooms list (per project) */}
            <section style={savedRowStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                Saved selections for this project
              </h2>

              {selections.length === 0 ? (
                <p style={{ fontSize: 13, color: "#666" }}>
                  No rooms have been added yet.
                </p>
              ) : (
                selections.map((sel, index) => (
                  <div key={index} style={savedItemStyle}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {sel.roomName || "Room"}
                      </div>
                      <div style={{ fontSize: 12, color: "#777" }}>
                        Material: {sel.materialType || "-"} <br />
                        Finish: {sel.finishType || "-"}
                      </div>
                    </div>

                    <div
                      style={{
                        ...colorBoxStyle,
                        backgroundColor: sel.wallColor || "#ffffff",
                      }}
                    >
                      Wall
                    </div>
                    <div
                      style={{
                        ...colorBoxStyle,
                        backgroundColor: sel.furnitureColor || "#ffffff",
                      }}
                    >
                      Furniture
                    </div>
                    <div
                      style={{
                        ...colorBoxStyle,
                        backgroundColor: sel.floorColor || "#ffffff",
                      }}
                    >
                      Floor
                    </div>

                    <div style={{ textAlign: "right", fontSize: 12 }}>
                      <button
                        type="button"
                        style={smallButton}
                        onClick={() => handleEdit(index)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        style={smallButton}
                        onClick={() => handleDelete(index)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={handleSaveAllToProject}
                disabled={saving}
                style={{
                  marginTop: 14,
                  padding: "10px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,192,203,0.9)",
                  background: "linear-gradient(90deg,#ffd1dc,#ff9eb5)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {saving
                  ? "Saving selections..."
                  : "Save all selections to project"}
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
