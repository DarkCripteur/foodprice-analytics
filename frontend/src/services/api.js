const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    let message = `Erreur API (${response.status})`;
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch {
      message = `${message} : ${response.statusText || "réponse invalide"}`;
    }
    throw new Error(message);
  }
  return response.json();
}

function queryString(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const api = {
  health: () => request("/api/health"),
  products: () => request("/api/products"),
  regions: () => request("/api/regions"),
  markets: (filters) => request(`/api/markets${queryString(filters)}`),
  prices: (filters) => request(`/api/prices${queryString(filters)}`),
  summary: (filters) => request(`/api/analytics/summary${queryString(filters)}`),
  trends: (filters) => request(`/api/analytics/trends${queryString(filters)}`),
  metrics: (filters) => request(`/api/predictions/metrics${queryString(filters)}`),
  predict: (payload) => request("/api/predictions", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  exportPrices: (filters) => fetch(`${API_URL}/api/prices/export${queryString(filters)}`),
};
