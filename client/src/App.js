// client/src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DesignerDashboard from "./pages/DesignerDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import ProjectMenu from "./pages/ProjectMenu";
import WorkersPage from "./pages/WorkersPage";
import SuppliersPage from "./pages/SuppliersPage";
import ProjectPlanPage from "./pages/ProjectPlanPage";
import DesignerOptionsPage from "./pages/DesignerOptionsPage";
import QuestionnaireTemplatesPage from "./pages/QuestionnaireTemplatesPage";
import ProjectQuestionnairesPage from "./pages/ProjectQuestionnairesPage";
import ProjectColorsPage from "./pages/ProjectColorsPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Default – redirect root ("/") to login page */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth pages (public) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Designer area – only for role "designer" */}
      <Route
        path="/designer"
        element={
          <ProtectedRoute allowedRoles={["designer"]}>
            <DesignerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Manage global design options – only designer */}
      <Route
        path="/designer/options"
        element={
          <ProtectedRoute allowedRoles={["designer"]}>
            <DesignerOptionsPage />
          </ProtectedRoute>
        }
      />

      {/* Manage questionnaire templates – only designer */}
      <Route
        path="/designer/questionnaires"
        element={
          <ProtectedRoute allowedRoles={["designer"]}>
            <QuestionnaireTemplatesPage />
          </ProtectedRoute>
        }
      />

      {/* Client dashboard – only for role "client" */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />

      {/* Project main menu – shared (designer + client) */}
      <Route
        path="/project/:projectId/menu"
        element={
          <ProtectedRoute allowedRoles={["designer", "client"]}>
            <ProjectMenu />
          </ProtectedRoute>
        }
      />

      {/* Workers page – per project, shared */}
      <Route
        path="/project/:projectId/workers"
        element={
          <ProtectedRoute allowedRoles={["designer", "client"]}>
            <WorkersPage />
          </ProtectedRoute>
        }
      />

      {/* Suppliers page – per project, shared */}
      <Route
        path="/project/:projectId/suppliers"
        element={
          <ProtectedRoute allowedRoles={["designer", "client"]}>
            <SuppliersPage />
          </ProtectedRoute>
        }
      />

      {/* Project plan (design plan + costs) – shared */}
      <Route
        path="/project/:projectId/plan"
        element={
          <ProtectedRoute allowedRoles={["designer", "client"]}>
            <ProjectPlanPage />
          </ProtectedRoute>
        }
      />

      {/* Design questionnaires attached to a project – shared */}
      <Route
        path="/project/:projectId/questionnaire"
        element={
          <ProtectedRoute allowedRoles={["designer", "client"]}>
            <ProjectQuestionnairesPage />
          </ProtectedRoute>
        }
      />

      {/* Color & material selection – shared */}
      <Route
        path="/project/:projectId/colors"
        element={
          <ProtectedRoute allowedRoles={["designer", "client"]}>
            <ProjectColorsPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback for unknown routes */}
      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
  );
}

export default App;
