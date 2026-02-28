const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function apiFetch(path, options = {}) {
  // Recuperamos el token del almacenamiento local
  const token = localStorage.getItem("token");

  // Configuramos las cabeceras por defecto
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Si el backend devuelve 401 (Unauthorized), el token ha expirado o es inválido
  if (res.status === 401 && path !== "/auth/login") {
    localStorage.removeItem("token");
    // Opcional: Redirigir al login o recargar para limpiar el estado del front
    window.location.reload(); 
    throw new Error("Sesión expirada. Por favor, inicia sesión de nuevo.");
  }

  const text = await res.text();
  const data = text ? tryJson(text) : null;

  if (!res.ok) {
    // El backend de FastAPI suele enviar el error en el campo 'detail'
    console.error("Error API Details:", data?.detail);
    throw new Error((data && (data.detail || data.message)) || `${res.status} ${res.statusText}`);
  }

  if (path === "/auth/login" && data?.access_token) {
    localStorage.setItem("token", data.access_token);
  }

  return data;
}

function tryJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}