// client/src/pages/RegisterPage.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api";

/**
 * Registration page for new users (designer or client).
 * Uses the shared API helper (registerUser) so all requests
 * go through the same JSON + auth handling.
 */
export default function RegisterPage() {
  const navigate = useNavigate();

  // Registration form state
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "designer",
  });

  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // Call the frontend API helper, which calls /api/register
      const data = await registerUser(form);

      // If the backend returns a message, show it to the user
      if (data?.message) {
        alert(data.message);
      } else {
        alert("User registered successfully");
      }

      // After successful registration → go to login page
      navigate("/login");
    } catch (err) {
      console.error("Registration failed:", err);
      alert(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const pageStyle = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255, 255, 255, 0.92)",
    borderRadius: 18,
    padding: 32,
    boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,192,203,0.7)",
  };

  const titleStyle = {
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 8,
    textAlign: "center",
  };

  const subtitleStyle = {
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
    color: "#555",
  };

  const labelStyle = {
    display: "block",
    fontSize: 14,
    marginBottom: 6,
    fontWeight: 500,
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ccc",
    fontSize: 14,
    boxSizing: "border-box",
    marginBottom: 10,
  };

  const buttonStyle = {
    width: "100%",
    marginTop: 8,
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    background: "#ff9eb5",
    color: "#222",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
  };

  const linkRowStyle = {
    marginTop: 16,
    textAlign: "center",
    fontSize: 13,
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Interior Design Project Management</h1>
        <p style={subtitleStyle}>Create your account to get started.</p>

        <form onSubmit={handleSubmit}>
          <div>
            <label style={labelStyle} htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Choose a username"
              value={form.username}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Choose a password"
              value={form.password}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="role">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="designer">Designer</option>
              <option value="client">Client</option>
            </select>
          </div>

          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <div style={linkRowStyle}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#ff6f91", fontWeight: 600 }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
