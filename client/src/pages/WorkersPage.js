// client/src/pages/WorkersPage.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchProjectWorkers,
  createProjectWorker,
  updateProjectWorker,
  deleteProjectWorker,
} from "../api";

export default function WorkersPage() {
  const { projectId } = useParams();

  /* =========================
     State
     ========================= */
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");


  const [form, setForm] = useState({
    workerName: "",
    role: "",
    phone: "",
    cost: "",
    description: "",
  });
  const [editingId, setEditingId] = useState(null);

  const role = localStorage.getItem("role");
  const isDesigner = role === "designer";

  /* =========================
     Load workers (from backend)
     ========================= */
  async function loadWorkers() {
    if (!projectId) return;
    setLoading(true);
    setError("");

    try {
      const data = await fetchProjectWorkers(projectId);
      setWorkers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load workers:", err);
      setError(err.message || "Failed to load workers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /* =========================
     Form handlers
     ========================= */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm({
      workerName: "",
      role: "",
      phone: "",
      cost: "",
      description: "",
    });
    setEditingId(null);
  }

  /* =========================
     Create / Update worker
     ========================= */
 async function handleSubmit(e) {
  e.preventDefault();
  if (!isDesigner) return;

  const isEditing = Boolean(editingId); // snapshot of current state

  setSaving(true);
  setError("");

  const body = {
    workerName: form.workerName,
    role: form.role,
    phone: form.phone,
    cost: form.cost ? Number(form.cost) : 0,
    description: form.description,
  };

  try {
    if (isEditing) {
      await updateProjectWorker(projectId, editingId, body);
    } else {
      await createProjectWorker(projectId, body);
    }

    await loadWorkers();
    setMessage(isEditing ? "Worker updated successfully." : "Worker added successfully.");
    resetForm();
  } catch (err) {
    console.error("Failed to save worker:", err);
    setError(err.message || "Failed to save worker");
  } finally {
    setSaving(false);
  }
}

  function startEdit(worker) {
    setForm({
      workerName: worker.workerName || "",
      role: worker.role || "",
      phone: worker.phone || "",
      cost: worker.cost != null ? String(worker.cost) : "",
      description: worker.description || "",
    });
    setEditingId(worker._id);
  }

  /* =========================
     Delete worker
     ========================= */
  async function handleDelete(workerId) {
    if (!isDesigner) return;
    if (!window.confirm("Delete this worker?")) return;

    setError("");
    try {
      await deleteProjectWorker(projectId, workerId);
      await loadWorkers();
    } catch (err) {
      console.error("Failed to delete worker:", err);
      setError(err.message || "Failed to delete worker");
    }
  }




  /* =========================
     Render
     ========================= */
  return (
    <div className="workers-management-container">
      <div className="workers-management-card">
        <h1 className="workers-management-heading">Workers</h1>
        <div className="workers-management-row">
         <p className="suppliers-management-sub-heading">
           {isDesigner
             ? "Here you can manage the workers related to this project."
             : "Here you can see the workers your designer selected for this project."}
         </p>

         <div style={{ marginBottom: 16 }}>
           <Link to={`/project/${projectId}/menu`} className="workers-management-link">Back to Project</Link>
         </div>
        </div>

        {error && (
          <div style={{ color: "red", marginBottom: 16 }}>{error}</div>
        )}
        {message && (
         <div style={{ color: "green", marginBottom: 12 }}>{message}</div>
        )}


        {/* Form – only visible for designer role */}
        {isDesigner && (
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>
              {editingId ? "Edit Worker" : "Add Worker"}
            </h2>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px 20px",
                alignItems: "flex-end",
              }}
            >
              <div>
                <label className="workers-management-label">Name</label>
                <input
                  type="text"
                  name="workerName"
                  value={form.workerName}
                  onChange={handleChange}
                  required
                  className="workers-management-container input"
                />
              </div>

              <div>
                <label className="workers-management-label">Role</label>
                <input
                  type="text"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="workers-management-container input"
                />
              </div>

              <div>
                <label className="workers-management-label">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="workers-management-container input"
                />
              </div>

              <div>
                <label className="workers-management-label">Cost</label>
                <input
                  type="number"
                  name="cost"
                  value={form.cost}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="workers-management-container input"
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label className="workers-management-label">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={2}
                  className="workers-management-container input"
                />
              </div>

              <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                <button type="submit" disabled={saving} className="workers-management-button-primary">
                  {saving
                    ? editingId
                      ? "Saving..."
                      : "Adding..."
                    : editingId
                    ? "Save Changes"
                    : "Add Worker"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="workers-management-button-secondary"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        )}

        {/* Workers list – visible for both designer and client */}
        <section>
          <h2 style={{ marginTop: 0 }}>Workers List</h2>
          {loading ? (
            <p>Loading workers...</p>
          ) : workers.length === 0 ? (
            <p>No workers yet.</p>
          ) : (
            <table className="workers-management-table">
              <thead>
                <tr>
                  <th className="workers-management-thtd workers-management-thtd-header">Name</th>
                  <th className="workers-management-thtd workers-management-thtd-header">Role</th>
                  <th className="workers-management-thtd workers-management-thtd-header">Phone</th>
                  <th className="workers-management-thtd workers-management-thtd-header">Cost</th>
                  <th className="workers-management-thtd workers-management-thtd-header">Description</th>
                  {isDesigner && <th className="workers-management-thtd workers-management-thtd-header">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w._id}>
                    <td className="workers-management-thtd">{w.workerName}</td>
                    <td className="workers-management-thtd">{w.role}</td>
                    <td className="workers-management-thtd">{w.phone}</td>
                    <td className="workers-management-thtd">{w.cost}</td>
                    <td className="workers-management-thtd">{w.description}</td>
                    {isDesigner && (
                      <td className="workers-management-thtd">
                        <button
                          type="button"
                          onClick={() => startEdit(w)}
                          className="workers-management-button-secondary"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(w._id)}
                          className="workers-management-button-secondary"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
