// client/src/pages/ClientDashboard.js

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchProjects,
  fetchClientInvites,
  acceptProjectInvite,
  rejectProjectInvite,
} from "../api"; // API helpers

import { logout } from "../utils/logout";

/**
 * ClientDashboard
 *
 * This page is the main home screen for a logged-in client.
 * It shows:
 * - A list of projects assigned to the current client.
 * - Links to open the project menu (workers / suppliers / plan).
 * - A direct link to view the design plan.
 * - A logout button.
 */
export default function ClientDashboard() {
  const [projects, setProjects] = useState([]);
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  /**
   * Load all projects for the current client from the backend.
   * Uses the shared API helper (fetchProjects) which already
   * handles JWT, headers, base URL, etc.
   */
  async function loadProjects() {
    setLoading(true);
    setError("");

    try {
      const data = await fetchProjects();

      // Backend may return either:
      //  - an array of projects, or
      //  - an object with `projects` property
      const normalized = Array.isArray(data) ? data : data.projects || [];
      setProjects(normalized);
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  /**
 * Load all pending invites for the current client.
 * If a client accepts an invite, the project will appear later in "Your Projects".
 */
async function loadInvites() {
  setInvitesLoading(true);
  setError("");

  try {
    const data = await fetchClientInvites();
    const normalized = Array.isArray(data) ? data : [];
    setInvites(normalized);
  } catch (err) {
    console.error("Failed to load invites:", err);
    setError(err.message || "Failed to load invites");
  } finally {
    setInvitesLoading(false);
  }
}

  // Load projects once when the component mounts
useEffect(() => {
  loadInvites();
  loadProjects();
}, []);

/**
 * Accept an invite and refresh both invites + projects lists.
 */
async function handleAccept(projectId) {
  setError("");
  try {
    await acceptProjectInvite(projectId);
    await loadInvites();
    await loadProjects();
  } catch (err) {
    console.error("Failed to accept invite:", err);
    setError(err.message || "Failed to accept invite");
  }
}

/**
 * Reject an invite and refresh invites list.
 */
async function handleReject(projectId) {
  setError("");
  try {
    await rejectProjectInvite(projectId);
    await loadInvites();
  } catch (err) {
    console.error("Failed to reject invite:", err);
    setError(err.message || "Failed to reject invite");
  }
}

  // Simple inline styles (could be moved to CSS later if you want)
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
    fontSize: 30,
    fontWeight: 700,
    marginBottom: 8,
  };

  const subtitleStyle = {
    fontSize: 14,
    marginBottom: 20,
    color: "#555",
  };

  const sectionTitleStyle = {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
    marginTop: 16,
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Top-right logout button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={() => logout(navigate)}
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid rgba(244, 143, 177, 0.9)",
              background: "linear-gradient(90deg,#ffcdd2,#f48fb1)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>

        <h1 style={titleStyle}>Client Dashboard</h1>
        <p style={subtitleStyle}>
          Here you can see the projects your designer created for you.
        </p>

        {/* Error message banner */}
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
        <section>
          <h2 style={sectionTitleStyle}>Invitations</h2>

          {invitesLoading ? (
            <p>Loading invites...</p>
          ) : invites.length === 0 ? (
            <p>No pending invitations.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                border="1"
                cellPadding="8"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                  marginBottom: 16,
                }}
              >
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((p) => (
                    <tr key={p._id}>
                      <td>{p.name}</td>
                      <td>
                        <button type="button" onClick={() => handleAccept(p._id)}>
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(p._id)}
                          style={{ marginLeft: 8 }}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
       </section>

        <section>
          <h2 style={sectionTitleStyle}>Your Projects</h2>

          {/* Loading / empty / table states */}
          {loading ? (
            <p>Loading projects...</p>
          ) : projects.length === 0 ? (
            <p>No projects assigned to you yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
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
                    <th>Project Name</th>
                    <th>Designer</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Budget</th>
                    <th>Open</th>
                    <th>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p._id}>
                      <td>{p.name}</td>
                      <td>{p.createdByUsername || ""}</td>
                      <td>{p.startDate ? p.startDate.slice(0, 10) : ""}</td>
                      <td>{p.endDate ? p.endDate.slice(0, 10) : ""}</td>
                      <td>{p.budget != null ? p.budget : ""}</td>
                      <td>
                        {/* Navigate to the project menu (workers / suppliers / plan etc.) */}
                        <Link to={`/project/${p._id}/menu`}>Open Project</Link>
                      </td>
                      <td>
                        {/* Direct read-only view of the project plan */}
                        <Link to={`/project/${p._id}/plan`}>View Plan</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
