// Configure via a .env file (VITE_API_BASE=https://your-backend.example.com)
// Falls back to localhost for local development.
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers:
      options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {},
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.detail || text;
    } catch {
      // not JSON, keep raw text
    }
    throw new ApiError(message || `Request failed (${res.status})`, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Projects
  listProjects: () => request("/projects"),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) =>
    request("/projects", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id, data) =>
    request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: "DELETE" }),

  // Datasets
  listDatasets: (projectId) => request(`/projects/${projectId}/datasets`),
  uploadDataset: (projectId, file, targetColumn) => {
    const fd = new FormData();
    fd.append("file", file);
    const qs = targetColumn ? `?target_column=${encodeURIComponent(targetColumn)}` : "";
    return request(`/projects/${projectId}/datasets${qs}`, { method: "POST", body: fd });
  },
  renameDataset: (projectId, datasetId, filename) =>
    request(`/projects/${projectId}/datasets/${datasetId}`, {
      method: "PATCH",
      body: JSON.stringify({ filename }),
    }),
  deleteDataset: (projectId, datasetId) =>
    request(`/projects/${projectId}/datasets/${datasetId}`, { method: "DELETE" }),

  // Algorithms
  listAlgorithms: () => request("/algorithms"),

  // Experiments
  train: (projectId, payload) =>
    request(`/projects/${projectId}/train`, { method: "POST", body: JSON.stringify(payload) }),
  listExperiments: (projectId) => request(`/projects/${projectId}/experiments`),
  deleteExperiment: (projectId, experimentId) =>
    request(`/projects/${projectId}/experiments/${experimentId}`, { method: "DELETE" }),

  // Deployments
  listDeployments: (projectId) => request(`/projects/${projectId}/deployments`),
  promote: (projectId, experimentId, notes = "") =>
    request(`/projects/${projectId}/deployments`, {
      method: "POST",
      body: JSON.stringify({ experiment_id: experimentId, notes }),
    }),
  rollback: (projectId, deploymentId) =>
    request(`/projects/${projectId}/deployments/rollback/${deploymentId}`, { method: "POST" }),

  // Inference
  predict: (projectId, records) =>
    request(`/projects/${projectId}/predict`, {
      method: "POST",
      body: JSON.stringify({ records }),
    }),
};

export { ApiError };
