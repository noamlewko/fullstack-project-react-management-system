// client/src/components/ProtectedRoute.js

import React from "react";
import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute
 *
 * Wraps a route and only allows access if:
 * 1. There is a JWT token in localStorage ("token")
 * 2. AND (optionally) the user's role is included in allowedRoles
 *
 * Props:
 * - allowedRoles?: string[]  (e.g. ["designer"], ["designer", "client"])
 * - children: ReactNode      The page / component to render if allowed
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // 1. If there is no token → user is not authenticated → redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. If allowedRoles is provided, and the current role is NOT in that list
  //    → user is authenticated but not authorized for this page → redirect
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  // 3. Otherwise → user is authenticated (and authorized if needed) → show page
  return children;
}
