const DEFAULT_API_BASE = "https://remit-db.mintos.space";
const API_BASE = (import.meta.env.VITE_API_BASE ?? DEFAULT_API_BASE).replace(/\/+$/, "");

export async function apiFetch(path, options = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const token = localStorage.getItem("token");

  const headers = {
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  if (!("Content-Type" in headers) && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${normalizedPath}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && normalizedPath !== "/auth/login") {
    localStorage.removeItem("token");
    window.location.reload();
    throw new Error("Sesión expirada. Por favor, inicia sesión de nuevo.");
  }

  const text = await res.text();
  const data = text ? tryJson(text) : null;

  if (!res.ok) {
    console.error("Error API Details:", data?.detail);
    throw new Error((data && (data.detail || data.message)) || `${res.status} ${res.statusText}`);
  }

  if (normalizedPath === "/auth/login" && data?.access_token) {
    localStorage.setItem("token", data.access_token);
  }

  return data;
}

function tryJson(text) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}
