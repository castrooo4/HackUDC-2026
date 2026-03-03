import { apiFetch } from "./client";
import { emitRemitEvent } from "../utils/bridgeEvents";

export async function login(email, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (data?.access_token) {
    localStorage.setItem("token", data.access_token);
    emitRemitEvent("REMIT_LOGIN_SUCCESS", { token: data.access_token });
  }
  return data;
}

export async function register(fullName, email, password) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
    }),
  });
}

export const getMe = () => apiFetch("/auth/me");

export function logout() {
  localStorage.removeItem("token");
  emitRemitEvent("REMIT_LOGOUT");
  window.location.reload();
}
