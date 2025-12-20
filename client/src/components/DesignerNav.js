// client/src/components/DesignerNav.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../utils/logout";

/**
 * Sidebar navigation for the designer dashboard.
 * Shows links to main designer sections + logout button.
 *
 * Props:
 * - active: string ("projects" | "options" | "questionnaires")
 *           used to highlight the current page in the sidebar.
 */
export default function DesignerNav({ active }) {
  const navigate = useNavigate();

  // Outer wrapper so the sidebar can stretch full height
  const wrapperStyle = {
    height: "100%",
  };

  // Card-style container for the sidebar content
  const cardStyle = {
    background: "rgba(255, 255, 255, 0.96)",
    borderRadius: 18,
    padding: "18px 16px 16px",
    boxShadow: "0 18px 40px rgba(0,0,0,0.16)",
    border: "1px solid rgba(255,192,203,0.7)",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    boxSizing: "border-box",
  };

  const logoStyle = {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
  };

  const navTitleStyle = {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: "#777",
  };

  const navListStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 16,
  };

  // Base style for all navigation items
  const navItemBase = {
    display: "block",
    padding: "8px 10px",
    borderRadius: 10,
    fontSize: 14,
    textDecoration: "none",
    cursor: "pointer",
  };

  // Style for the currently active nav item
  const navActiveStyle = {
    ...navItemBase,
    background: "rgba(255,145,175,0.18)",
    borderLeft: "4px solid #ff8faf",
    color: "#d81b60",
    fontWeight: 600,
  };

  // Style for regular (non-active) nav items
  const navLinkStyle = {
    ...navItemBase,
    color: "#444",
  };

  // Logout button at the bottom of the sidebar
  const logoutButtonStyle = {
    marginTop: "auto",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(244, 143, 177, 0.9)",
    background: "linear-gradient(90deg,#ffcdd2,#f48fb1)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    textAlign: "center",
  };

  return (
    <aside style={wrapperStyle}>
      <div style={cardStyle}>
        <div style={logoStyle}>Designer Panel</div>

        <div style={navTitleStyle}>Navigation</div>

        {/* Main navigation links for the designer */}
        <nav style={navListStyle}>
          <Link
            to="/designer"
            style={active === "projects" ? navActiveStyle : navLinkStyle}
          >
            Projects
          </Link>

          <Link
            to="/designer/options"
            style={active === "options" ? navActiveStyle : navLinkStyle}
          >
            Design Options
          </Link>

          <Link
            to="/designer/questionnaires"
            style={active === "questionnaires" ? navActiveStyle : navLinkStyle}
          >
            Questionnaires
          </Link>
        </nav>

        {/* Logout clears auth and returns to login / home */}
        <button
          type="button"
          onClick={() => logout(navigate)}
          style={logoutButtonStyle}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
