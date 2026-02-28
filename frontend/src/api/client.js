const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });

  const text = await res.text();
  const data = text ? tryJson(text) : null;

  if (!res.ok) {
    throw new Error((data && (data.detail || data.message)) || `${res.status} ${res.statusText}`);
  }
  return data;
}

function tryJson(text) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}