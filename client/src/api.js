// client/src/api.js

/**
 * Generic API wrapper used by all frontend API helpers.
 * - Automatically attaches JSON headers and Authorization token (if exists).
 * - Throws an Error if the response is not ok.
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(path, {
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
  } catch (e) {
    // No JSON body – this is okay for some responses (e.g. 204 No Content)
  }

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

/* =====================================================
 * Project-related API helpers
 * ===================================================== */

/**
 * Fetch all projects for the current user (designer or client).
 */
export function fetchProjects() {
  return apiFetch("/api/projects");
}

/**
 * Create a new project.
 * Expects payload: { name, startDate?, endDate?, budget?, clientUsername }
 */
export function createProject(payload) {
  return apiFetch("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update a project by id with the given payload.
 * The payload is merged/overwritten on the backend according to your logic.
 */
export function updateProject(projectId, payload) {
  return apiFetch(`/api/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a project by id.
 */
export function deleteProject(projectId) {
  return apiFetch(`/api/projects/${projectId}`, {
    method: "DELETE",
  });
}

/**
 * Fetch a single project by id.
 */
export function fetchProjectById(projectId) {
  return apiFetch(`/api/projects/${projectId}`);
}

/**
 * Update only the colorSelections field of a project.
 * The backend should merge or overwrite this field, depending on your logic.
 */
export function updateProjectColorSelections(projectId, colorSelections) {
  return apiFetch(`/api/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify({ colorSelections }),
  });
}

/**
 * Update only the design plan and notes of a project.
 * Used by ProjectPlanPage for designer edits.
 */
export function updateProjectPlan(projectId, { designPlan, notes }) {
  return apiFetch(`/api/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify({ designPlan, notes }),
  });
}
/* =====================================================
 * Suppliers API helpers
 * ===================================================== */

/**
 * Get all suppliers for a specific project.
 * Endpoint: GET /api/projects/:projectId/suppliers
 */
export function fetchProjectSuppliers(projectId) {
  return apiFetch(`/api/projects/${projectId}/suppliers`);
}

/**
 * Create a new supplier for a project.
 * Endpoint: POST /api/projects/:projectId/suppliers
 */
export function createProjectSupplier(projectId, payload) {
  return apiFetch(`/api/projects/${projectId}/suppliers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing supplier by id for a project.
 * Endpoint: PUT /api/projects/:projectId/suppliers/:supplierId
 */
export function updateProjectSupplier(projectId, supplierId, payload) {
  return apiFetch(`/api/projects/${projectId}/suppliers/${supplierId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a supplier from a project.
 * Endpoint: DELETE /api/projects/:projectId/suppliers/:supplierId
 */
export function deleteProjectSupplier(projectId, supplierId) {
  return apiFetch(`/api/projects/${projectId}/suppliers/${supplierId}`, {
    method: "DELETE",
  });
}
/* =====================================================
 * Workers API helpers
 * ===================================================== */

/**
 * Fetch all workers for a specific project.
 * Endpoint: GET /api/projects/:projectId/workers
 */
export function fetchProjectWorkers(projectId) {
  return apiFetch(`/api/projects/${projectId}/workers`);
}

/**
 * Create a new worker for a specific project.
 * Endpoint: POST /api/projects/:projectId/workers
 */
export function createProjectWorker(projectId, payload) {
  return apiFetch(`/api/projects/${projectId}/workers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing worker by id for a specific project.
 * Endpoint: PUT /api/projects/:projectId/workers/:workerId
 */
export function updateProjectWorker(projectId, workerId, payload) {
  return apiFetch(`/api/projects/${projectId}/workers/${workerId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a worker by id for a specific project.
 * Endpoint: DELETE /api/projects/:projectId/workers/:workerId
 */
export function deleteProjectWorker(projectId, workerId) {
  return apiFetch(`/api/projects/${projectId}/workers/${workerId}`, {
    method: "DELETE",
  });
}

/* =====================================================
 * Design-options API helpers
 * ===================================================== */

/**
 * Get raw options from backend.
 * Tries to normalize different shapes:
 * - [ { _id, name, type } ]
 * - { options: [...] }
 * - { designPreferences: [...] }
 */
export async function fetchOptions() {
  const res = await apiFetch("/api/options");

  if (Array.isArray(res)) return res;
  if (Array.isArray(res.options)) return res.options;
  if (Array.isArray(res.designPreferences)) return res.designPreferences;

  return [];
}

/**
 * Save all design preferences (categories + options).
 * Expects: designPreferences: [{ topicName, options: string[] }]
 */
export function saveOptions(designPreferences) {
  return apiFetch("/api/options", {
    method: "POST",
    body: JSON.stringify({ designPreferences }),
  });
}

/* =====================================================
 * Auth helpers
 * ===================================================== */

/**
 * Login API helper.
 * Sends username + password to /api/login.
 * Returns the parsed JSON response from the server.
 */
export function loginUser({ username, password }) {
  return apiFetch("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}


/**
 * Register a new user.
 * Sends username, password and role to /api/register.
 * Returns the parsed JSON response from the server.
 */
export function registerUser({ username, password, role }) {
  return apiFetch("/api/register", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}


/* =====================================================
 * Questionnaire API helpers
 * ===================================================== */

/**
 * Fetch all questionnaire templates available for the designer.
 * Endpoint: GET /api/questionnaires/templates
 */
export function fetchQuestionnaireTemplates() {
  return apiFetch("/api/questionnaires/templates");
}

/**
 * Assign or update a questionnaire template on a specific project.
 * Endpoint: POST /api/projects/:projectId/questionnaire/assign
 * Body: { templateId }
 */
export function assignQuestionnaireTemplateToProject(projectId, templateId) {
  return apiFetch(`/api/projects/${projectId}/questionnaire/assign`, {
    method: "POST",
    body: JSON.stringify({ templateId }),
  });
}

/**
 * Clear all questionnaires from a project (optional helper).
 * Uses the same endpoint with an empty templateId.
 */
export function clearProjectQuestionnaires(projectId) {
  return apiFetch(`/api/projects/${projectId}/questionnaire/assign`, {
    method: "POST",
    body: JSON.stringify({ templateId: "" }),
  });
}

/**
 * Remove a single questionnaire instance from a project.
 * Endpoint: DELETE /api/projects/:projectId/questionnaires/:instanceId
 */
export function removeProjectQuestionnaireInstance(projectId, instanceId) {
  return apiFetch(`/api/projects/${projectId}/questionnaires/${instanceId}`, {
    method: "DELETE",
  });
}

/**
 * Save all answers for the current questionnaire instance of a project.
 * Endpoint: POST /api/projects/:projectId/questionnaire/answers
 * Body: { templateId, answers }
 */
export function saveProjectQuestionnaireAnswers(
  projectId,
  templateId,
  answers
) {
  return apiFetch(`/api/projects/${projectId}/questionnaire/answers`, {
    method: "POST",
    body: JSON.stringify({ templateId, answers }),
  });
}
/* =====================================================
 * Questionnaire Templates – CRUD (needed for Templates Page)
 * ===================================================== */

/** Create a new questionnaire template */
export function createQuestionnaireTemplate(payload) {
  return apiFetch("/api/questionnaires/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Update an existing questionnaire template */
export function updateQuestionnaireTemplate(templateId, payload) {
  return apiFetch(`/api/questionnaires/templates/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Delete a questionnaire template */
export function deleteQuestionnaireTemplate(templateId) {
  return apiFetch(`/api/questionnaires/templates/${templateId}`, {
    method: "DELETE",
  });
}
