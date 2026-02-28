// src/api/auth.js
import { apiFetch } from "./client";


export async function login(email, password) {
  const payload = {
    email: email,
    password: password
  };

  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // Ajusta esto según lo que devuelva tu API (access_token o token)
  if (data?.access_token) {
    localStorage.setItem("token", data.access_token);

    window.postMessage({ type: "REMIT_LOGIN_SUCCESS", token: data.access_token }, "*");
  }
  return data;
}

export async function register(username, email, password) {
  // CLAVE: El backend pide "full_name", no "username"
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: email,
      password: password,
      full_name: username // Mapeamos username a full_name
    }),
  });
}

export const getMe = () => apiFetch("/auth/me");

export function logout() {
  localStorage.removeItem("token");

  window.postMessage({ type: "REMIT_LOGOUT" }, "*");
  window.location.reload();
}