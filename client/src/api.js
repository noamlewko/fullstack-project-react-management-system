// client/src/api.js

/**
 * Frontend API helpers
 *
 * apiFetch:
 * - Attaches Authorization token automatically
 * - Assumes JSON responses for most endpoints
 * - Throws Error for non-2xx responses
 */

const API = process.env.REACT_APP_API_URL || "";

/* =====================================================
 * Core fetch wrapper
 * ===================================================== */

/**
 * Generic JSON API wrapper.
 * Use for all JSON endpoints.
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    // Some endpoints may return no JSON body
  }

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

/* =====================================================
 * Projects
 * ===================================================== */

/** Fetch all projects for current user */
export function fetchProjects() {
  return apiFetch("/api/projects");
}

/** Create a new project */
export function createProject(payload) {
  return apiFetch("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Update a project by id */
export function updateProject(projectId, payload) {
  return apiFetch(`/api/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Delete a project by id */
export function deleteProject(projectId) {
  return apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
}

/** Fetch single project */
export function fetchProjectById(projectId) {
  return apiFetch(`/api/projects/${projectId}`);
}

/** Update only colorSelections */
export function updateProjectColorSelections(projectId, colorSelections) {
  return apiFetch(`/api/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify({ colorSelections }),
  });
}

/** Update only design plan + notes */
export function updateProjectPlan(projectId, { designPlan, notes }) {
  return apiFetch(`/api/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify({ designPlan, notes }),
  });
}

/* =====================================================
 * Invitations (client approval flow)
 * ===================================================== */

/** Client: fetch pending invites */
export function fetchClientInvites() {
  return apiFetch("/api/invites");
}

/** Client: accept invite */
export function acceptProjectInvite(projectId) {
  return apiFetch(`/api/projects/${projectId}/invite/accept`, {
    method: "POST",
  });
}

/** Client: reject invite */
export function rejectProjectInvite(projectId) {
  return apiFetch(`/api/projects/${projectId}/invite/reject`, {
    method: "POST",
  });
}

/** Designer: send/resend invite */
export function inviteClientToProject(projectId, clientUsername) {
  return apiFetch(`/api/projects/${projectId}/invite`, {
    method: "POST",
    body: JSON.stringify({ clientUsername }),
  });
}

/* =====================================================
 * Suppliers
 * ===================================================== */

export function fetchProjectSuppliers(projectId) {
  return apiFetch(`/api/projects/${projectId}/suppliers`);
}

export function createProjectSupplier(projectId, payload) {
  return apiFetch(`/api/projects/${projectId}/suppliers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProjectSupplier(projectId, supplierId, payload) {
  return apiFetch(`/api/projects/${projectId}/suppliers/${supplierId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteProjectSupplier(projectId, supplierId) {
  return apiFetch(`/api/projects/${projectId}/suppliers/${supplierId}`, {
    method: "DELETE",
  });
}

/* =====================================================
 * Workers
 * ===================================================== */

export function fetchProjectWorkers(projectId) {
  return apiFetch(`/api/projects/${projectId}/workers`);
}

export function createProjectWorker(projectId, payload) {
  return apiFetch(`/api/projects/${projectId}/workers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProjectWorker(projectId, workerId, payload) {
  return apiFetch(`/api/projects/${projectId}/workers/${workerId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteProjectWorker(projectId, workerId) {
  return apiFetch(`/api/projects/${projectId}/workers/${workerId}`, {
    method: "DELETE",
  });
}

/* =====================================================
 * Design Options (designer)
 * ===================================================== */

/**
 * Fetch design preferences.
 * Supports multiple backend shapes safely.
 */
export async function fetchOptions() {
  const res = await apiFetch("/api/options");

  if (Array.isArray(res)) return res;
  if (Array.isArray(res.options)) return res.options;
  if (Array.isArray(res.designPreferences)) return res.designPreferences;

  return [];
}

/** Save design preferences */
export function saveOptions(designPreferences) {
  return apiFetch("/api/options", {
    method: "POST",
    body: JSON.stringify({ designPreferences }),
  });
}

/* =====================================================
 * Auth
 * ===================================================== */

export function loginUser({ username, password }) {
  return apiFetch("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function registerUser({ username, password, role }) {
  return apiFetch("/api/register", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

/* =====================================================
 * Questionnaires (templates + projects)
 * ===================================================== */

export function fetchQuestionnaireTemplates() {
  return apiFetch("/api/questionnaires/templates");
}

export function assignQuestionnaireTemplateToProject(projectId, templateId) {
  return apiFetch(`/api/projects/${projectId}/questionnaire/assign`, {
    method: "POST",
    body: JSON.stringify({ templateId }),
  });
}

export function clearProjectQuestionnaires(projectId) {
  return apiFetch(`/api/projects/${projectId}/questionnaire/assign`, {
    method: "POST",
    body: JSON.stringify({ templateId: "" }),
  });
}

export function removeProjectQuestionnaireInstance(projectId, instanceId) {
  return apiFetch(`/api/projects/${projectId}/questionnaires/${instanceId}`, {
    method: "DELETE",
  });
}

export function saveProjectQuestionnaireAnswers(projectId, templateId, answers) {
  return apiFetch(`/api/projects/${projectId}/questionnaire/answers`, {
    method: "POST",
    body: JSON.stringify({ templateId, answers }),
  });
}

/** Project-only edit of a questionnaire instance (designer) */
export function updateProjectQuestionnaireInstance(projectId, instanceId, payload) {
  return apiFetch(`/api/projects/${projectId}/questionnaires/${instanceId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/* =====================================================
 * Questionnaire Templates CRUD (designer)
 * ===================================================== */

export function createQuestionnaireTemplate(payload) {
  return apiFetch("/api/questionnaires/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateQuestionnaireTemplate(templateId, payload) {
  return apiFetch(`/api/questionnaires/templates/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteQuestionnaireTemplate(templateId) {
  return apiFetch(`/api/questionnaires/templates/${templateId}`, {
    method: "DELETE",
  });
}

/* =====================================================
 * Uploads (multipart) - NOT JSON
 * ===================================================== */

/**
 * Upload an image file to the server (Cloudinary).
 * Expects: FormData with field "image"
 */
export async function uploadImage(formData) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/upload-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Upload failed");
  return data; // { imageUrl }
}

/* =====================================================
 * Template sync to projects
 * ===================================================== */

export function syncTemplateToProjects(templateId, mode = "safe") {
  return apiFetch(`/api/questionnaires/templates/${templateId}/sync-projects`, {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
}
