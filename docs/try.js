import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api";

export default function RegisterForm() {
  const navigate = useNavigate(); // קריאה לפונקציה

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // הודעת שגיאה אחת פשוטה

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // מניחים שה־API מחזיר משהו כמו: { message: "...", success: true }
      const data = await registerUser(form);

      if (data.message) {
        alert(data.message);
      } else {
        alert("Registered successfully");
      }

      // אחרי רישום מוצלח – נווט לעמוד התחברות
      navigate("/login");
    } catch (err) {
      console.error("register failed", err);
      setError(err.message || "Register failed");
    } finally {
      setLoading(false);
    }
  }
  const pageStyle{
  minHeight:"100vh",
  width="100",
  display="flex",
  justifyContent: "center",
  alignItems: "center"
  }
  const cardStyle{
  width="100",
  maxWidth=420,
  b

  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: 24, borderRadius: 16, background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
        <h1 style={{ marginBottom: 16 }}>Register</h1>

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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 14 }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
