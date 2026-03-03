import { ENV } from "../config/env";

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

  const res = await fetch(`${ENV.API_BASE}${normalizedPath}`, {
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
    throw new Error(extractApiErrorMessage(data, res));
  }

  if (normalizedPath === "/auth/login" && data?.access_token) {
    localStorage.setItem("token", data.access_token);
  }

  return data;
}

function tryJson(text) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function extractApiErrorMessage(data, res) {
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail.trim();
  }

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const firstError = data.errors[0];
    if (typeof firstError?.message === "string" && firstError.message.trim()) {
      return firstError.message.trim();
    }
  }

  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    const first = data.detail[0];
    if (typeof first?.msg === "string" && first.msg.trim()) {
      return first.msg.trim();
    }
  }

  return `${res.status} ${res.statusText}`;
}
