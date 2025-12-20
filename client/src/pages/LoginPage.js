// client/src/pages/LoginPage.js

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../api";

/**
 * LoginPage
 *
 * Handles user login for both roles:
 * - designer → redirected to /designer
 * - client   → redirected to /client
 *
 * Flow:
 *  1. User types username + password.
 *  2. We call loginUser() (API helper).
 *  3. On success → store token + role in localStorage.
 *  4. Redirect according to role.
 */

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /** Handle changes in the username/password inputs */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  /**
   * Submit login form:
   * - prevent page refresh
   * - call backend login
   * - handle success / error
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Expecting: { message, token, role }
      const data = await loginUser({
        username: form.username,
        password: form.password,
      });

      if (!data.token || !data.role) {
        throw new Error("Invalid server response");
      }

      // Store token + role for later API calls and routing
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      // Navigate according to role
      if (data.role === "designer") {
        navigate("/designer");
      } else if (data.role === "client") {
        navigate("/client");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Simple inline styles ---------- */

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
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  };

  const subtitleStyle = {
    fontSize: "14px",
    marginBottom: 24,
    textAlign: "center",
    color: "#555",
  };

  const labelStyle = {
    display: "block",
    fontSize: "14px",
    marginBottom: 6,
    fontWeight: 500,
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ccc",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  const buttonStyle = {
    width: "100%",
    marginTop: 12,
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    background: "#ff9eb5",
    color: "#222",
    fontWeight: 600,
    fontSize: "15px",
    cursor: "pointer",
  };

  const linkRowStyle = {
    marginTop: 16,
    textAlign: "center",
    fontSize: "13px",
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Interior Design Login</h1>
        <p style={subtitleStyle}>
          Welcome back! Please sign in to manage or view your projects.
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
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              style={inputStyle}
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              style={inputStyle}
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Link to registration */}
        <div style={linkRowStyle}>
          Don&apos;t have an account?{" "}
          <Link to="/register" style={{ color: "#ff6f91", fontWeight: 600 }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
