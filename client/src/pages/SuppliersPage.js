// client/src/pages/SuppliersPage.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchProjectSuppliers,
  createProjectSupplier,
  updateProjectSupplier,
  deleteProjectSupplier,
} from "../api";

export default function SuppliersPage() {
  const { projectId } = useParams();

  /* =========================
     State
     ========================= */
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    storeName: "",
    supplierName: "",
    product: "",
    price: "",
    contactName: "",
    phone: "",
  });
  const [editingId, setEditingId] = useState(null);

  const role = localStorage.getItem("role");
  const isDesigner = role === "designer";

  /* =========================
     Load suppliers (from backend)
     ========================= */
  async function loadSuppliers() {
    if (!projectId) return;
    setLoading(true);
    setError("");

    try {
      const data = await fetchProjectSuppliers(projectId);
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
      setError(err.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
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
      storeName: "",
      supplierName: "",
      product: "",
      price: "",
      contactName: "",
      phone: "",
    });
    setEditingId(null);
  }

  /* =========================
     Create / Update supplier
     ========================= */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!isDesigner) return;

    setSaving(true);
    setError("");

    const body = {
      storeName: form.storeName,
      supplierName: form.supplierName,
      product: form.product,
      price: form.price ? Number(form.price) : 0,
      contactName: form.contactName,
      phone: form.phone,
    };

    try {
      if (editingId) {
        // Update existing supplier
        await updateProjectSupplier(projectId, editingId, body);
      } else {
        // Create new supplier
        await createProjectSupplier(projectId, body);
      }

      await loadSuppliers();
      resetForm();
    } catch (err) {
      console.error("Failed to save supplier:", err);
      setError(err.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     Delete supplier
     ========================= */
  async function handleDelete(supplierId) {
    if (!isDesigner) return;
    if (!window.confirm("Delete this supplier?")) return;

    setError("");
    try {
      await deleteProjectSupplier(projectId, supplierId);
      await loadSuppliers();
    } catch (err) {
      console.error("Failed to delete supplier:", err);
      setError(err.message || "Failed to delete supplier");
    }
  }

  /* =========================
     Render
     ========================= */
  return (
    <div className="suppliers-management-container">
      <div className="suppliers-management-card">
        <h1 className="suppliers-management-heading">Suppliers</h1>
        <div className="suppliers-management-row">
         <p className="suppliers-management-sub-heading">
           {isDesigner
             ? "Here you can manage the suppliers related to this project."
             : "Here you can see the suppliers your designer selected for this project."}
         </p>

         <div style={{ marginBottom: 16 }}>
           <Link to={`/project/${projectId}/menu`} className="suppliers-management-link">Back to Project</Link>
         </div>
        </div>

        {error && (
          <div style={{ color: "red", marginBottom: 16 }}>{error}</div>
        )}

        {/* Form – only visible for designer role */}
        {isDesigner && (
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>
              {editingId ? "Edit Supplier" : "Add Supplier"}
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
                <label className="suppliers-management-label">Store Name</label>
                <input
                  type="text"
                  name="storeName"
                  value={form.storeName}
                  onChange={handleChange}
                  className="suppliers-management-container input"
                  required
                />
              </div>

              <div>
                <label className="suppliers-management-label">Supplier Name</label>
                <input
                  type="text"
                  name="supplierName"
                  value={form.supplierName}
                  onChange={handleChange}
                  className="suppliers-management-container input"
                />
              </div>

              <div>
                <label className="suppliers-management-label">Product</label>
                <input
                  type="text"
                  name="product"
                  value={form.product}
                  onChange={handleChange}
                  className="suppliers-management-container input"
                />
              </div>

              <div>
                <label className="suppliers-management-label">Price</label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="suppliers-management-container input"
                />
              </div>

              <div>
                <label className="suppliers-management-label">Contact Name</label>
                <input
                  type="text"
                  name="contactName"
                  value={form.contactName}
                  onChange={handleChange}
                  className="suppliers-management-container input"
                />
              </div>

              <div>
                <label className="suppliers-management-label">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="suppliers-management-container input"
                />
              </div>

              <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                <button type="submit" disabled={saving} className="suppliers-management-button-primary">
                  {saving
                    ? editingId
                      ? "Saving..."
                      : "Adding..."
                    : editingId
                    ? "Save Changes"
                    : "Add Supplier"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="suppliers-management-button-secondary"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        )}

        {/* Suppliers list – visible for both designer and client */}
        <section>
          <h2 style={{ marginTop: 0 }}>Suppliers List</h2>
          {loading ? (
            <p>Loading suppliers...</p>
          ) : suppliers.length === 0 ? (
            <p>No suppliers yet.</p>
          ) : (
            <table className="suppliers-management-table">
              <thead>
                <tr>
                  <th className="suppliers-management-thtd suppliers-management-thtd-header">Store</th>
                  <th className="suppliers-management-thtd suppliers-management-thtd-header">Supplier</th>
                  <th className="suppliers-management-thtd suppliers-management-thtd-header">Product</th>
                  <th className="suppliers-management-thtd suppliers-management-thtd-header">Price</th>
                  <th className="suppliers-management-thtd suppliers-management-thtd-header">Contact</th>
                  <th className="suppliers-management-thtd suppliers-management-thtd-header">Phone</th>
                  {isDesigner && <th className="suppliers-management-thtd suppliers-management-thtd-header">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s._id}>
                    <td className="suppliers-management-thtd">{s.storeName}</td>
                    <td className="suppliers-management-thtd">{s.supplierName}</td>
                    <td className="suppliers-management-thtd">{s.product}</td>
                    <td className="suppliers-management-thtd">{s.price}</td>
                    <td className="suppliers-management-thtd">{s.contactName}</td>
                    <td className="suppliers-management-thtd">{s.phone}</td>
                    {isDesigner && (
                      <td className="suppliers-management-thtd">
                        <button
                          type="button"
                          onClick={() => {
                            setForm({
                              storeName: s.storeName || "",
                              supplierName: s.supplierName || "",
                              product: s.product || "",
                              price:
                                s.price != null ? String(s.price) : "",
                              contactName: s.contactName || "",
                              phone: s.phone || "",
                            });
                            setEditingId(s._id);
                          }}
                          className="suppliers-management-button-secondary"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s._id)}
                          className="suppliers-management-button-secondary"
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
