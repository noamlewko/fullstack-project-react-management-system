// client/src/pages/DesignerOptionsPage.js

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOptions, saveOptions } from "../api";

/**
 * DesignerOptionsPage
 *
 * Global design options manager for the designer.
 * - Loads all options from the backend.
 * - Groups them by category (topicName).
 * - Allows adding/removing categories and options.
 * - Saves everything back to the server in a single payload.
 *
 * Local UI shape (this component):
 *   groups: Array<{
 *     topicName: string;
 *     options: string[];        // just option names in the UI
 *   }>
 *
 * Backend shape (what we send & expect to get):
 *   designPreferences: Array<{
 *     topicName: string;
 *     options: Array<{ name: string; imageUrl: string }>
 *   }>
 */

export default function DesignerOptionsPage() {
  const [groups, setGroups] = useState([]); // [{ topicName, options: [string] }]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /**
   * Load options from backend.
   *
   * We support two shapes:
   * 1) New shape (designPreferences):
   *    [
   *      {
   *        topicName: "Living room style",
   *        options: [ { name: "Modern" }, { name: "Boho" } ]
   *      },
   *      ...
   *    ]
   *
   * 2) Old shape (flat options with type/name):
   *    [
   *      { _id, name: "Modern", type: "Living room style" },
   *      ...
   *    ]
   */
  async function loadOptions() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const raw = await fetchOptions() || [];

      let normalizedGroups = [];

      // Case 1: new shape (topicName + options array)
      if (
        Array.isArray(raw) &&
        raw.length > 0 &&
        Object.prototype.hasOwnProperty.call(raw[0], "topicName")
      ) {
        normalizedGroups = raw.map((topic) => ({
          topicName: topic.topicName || "",
          options: Array.isArray(topic.options)
            ? topic.options.map((o) =>
                typeof o === "string"
                  ? o
                  : (o && typeof o.name === "string" ? o.name : "")
              )
            : [],
        }));
      } else {
        // Case 2: old shape (flat { name, type })
        const byType = {};
        for (const opt of raw) {
          const type = opt.type || "General";
          if (!byType[type]) byType[type] = [];
          if (opt.name) byType[type].push(opt.name);
        }

        normalizedGroups = Object.entries(byType).map(
          ([topicName, options]) => ({
            topicName,
            options,
          })
        );
      }

      setGroups(normalizedGroups);
    } catch (err) {
      console.error("Failed to load options:", err);
      setError(err.message || "Failed to load options");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOptions();
  }, []);

  /** Update category (topic) name by index */
  function updateGroupTopic(index, value) {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, topicName: value } : g))
    );
  }

  /** Update a specific option text inside a given group */
  function updateOptionValue(groupIndex, optionIndex, value) {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== groupIndex) return g;
        const newOptions = [...g.options];
        newOptions[optionIndex] = value;
        return { ...g, options: newOptions };
      })
    );
  }

  /** Add a new category with a default name and one option */
  function addGroup() {
    setGroups((prev) => [
      ...prev,
      { topicName: "New Category", options: ["New option"] },
    ]);
  }

  /** Remove a category (and all its options) by index */
  function removeGroup(index) {
    if (!window.confirm("Delete this category and all its options?")) return;
    setGroups((prev) => prev.filter((_, i) => i !== index));
  }

  /** Add a new option to an existing group */
  function addOptionToGroup(index) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === index ? { ...g, options: [...g.options, "New option"] } : g
      )
    );
  }

  /** Remove a single option from a given group */
  function removeOptionFromGroup(groupIndex, optionIndex) {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== groupIndex) return g;
        const newOptions = g.options.filter((_, j) => j !== optionIndex);
        return { ...g, options: newOptions };
      })
    );
  }

  /**
   * Save all categories + options to the backend.
   *
   * We convert the local UI shape (options: string[])
   * into the backend shape (options: [{ name, imageUrl }]).
   */
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = groups.map((g) => ({
        topicName: g.topicName || "",
        options: (g.options || [])
          .filter((name) => name && String(name).trim() !== "")
          .map((name) => ({
            name: String(name).trim(),
            imageUrl: "", // no images for now, can be extended later
          })),
      }));

      await saveOptions(payload);
      setMessage("Options saved successfully.");

      // Reload from backend (to make sure we see exactly what is stored)
      await loadOptions();
    } catch (err) {
      console.error("Failed to save options:", err);
      setError(err.message || "Failed to save options");
    } finally {
      setSaving(false);
    }
  }

  /* ---------- Simple inline styles ---------- */

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
  };

  const titleStyle = {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
  };

  const subtitleStyle = {
    fontSize: 14,
    marginBottom: 16,
    color: "#555",
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 8, fontSize: 14 }}>
          <Link to="/designer">← Back to Designer Dashboard</Link>
        </div>

        <h1 style={titleStyle}>Design Options</h1>
        <p style={subtitleStyle}>
          Here you can define global design categories and options that you
          will later use with your clients (e.g. style, colors, materials).
        </p>

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

        {/* Success banner */}
        {message && (
          <div
            style={{
              marginBottom: 16,
              padding: "6px 10px",
              borderRadius: 10,
              background: "#e5ffe8",
              color: "#1b5e20",
              fontSize: 13,
            }}
          >
            {message}
          </div>
        )}

        {loading ? (
          <p>Loading options...</p>
        ) : (
          <form onSubmit={handleSave}>
            {groups.length === 0 && (
              <p style={{ marginBottom: 12 }}>
                No categories yet. Click &quot;Add Category&quot; to create one.
              </p>
            )}

            {groups.map((group, gIndex) => (
              <div
                key={gIndex}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                  background: "#fafafa",
                }}
              >
                {/* Category header: name + delete button */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <input
                    type="text"
                    value={group.topicName}
                    onChange={(e) => updateGroupTopic(gIndex, e.target.value)}
                    style={{
                      flex: 1,
                      marginRight: 8,
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                    }}
                    placeholder="Category name (e.g. Living Room Style)"
                  />
                  <button
                    type="button"
                    onClick={() => removeGroup(gIndex)}
                    style={{
                      background: "#ffcccc",
                      border: "1px solid #ff8a80",
                      borderRadius: 8,
                      padding: "4px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>

                {/* Options list inside the category */}
                <div style={{ marginLeft: 4 }}>
                  {group.options.map((opt, oIndex) => (
                    <div
                      key={oIndex}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) =>
                          updateOptionValue(gIndex, oIndex, e.target.value)
                        }
                        style={{
                          flex: 1,
                          marginRight: 8,
                          padding: "5px 8px",
                          borderRadius: 8,
                          border: "1px solid #ccc",
                        }}
                        placeholder="Option (e.g. Modern, Rustic, Boho...)"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeOptionFromGroup(gIndex, oIndex)
                        }
                        style={{
                          background: "#eeeeee",
                          border: "1px solid #ccc",
                          borderRadius: 8,
                          padding: "4px 10px",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addOptionToGroup(gIndex)}
                    style={{
                      marginTop: 4,
                      background: "#e3f2fd",
                      border: "1px solid #90caf9",
                      borderRadius: 8,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    + Add option
                  </button>
                </div>
              </div>
            ))}

            {/* Add category + Save buttons */}
            <div style={{ marginTop: 12, marginBottom: 16 }}>
              <button
                type="button"
                onClick={addGroup}
                style={{
                  marginRight: 8,
                  background: "#fce4ec",
                  border: "1px solid #f48fb1",
                  borderRadius: 10,
                  padding: "6px 14px",
                  cursor: "pointer",
                }}
              >
                + Add Category
              </button>
            </div>

            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save All Options"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
