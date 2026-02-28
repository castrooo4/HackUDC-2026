import { apiFetch } from "./client";

export const getTelegramLinkStatus = () => apiFetch("/telegram/link");

export const createTelegramLinkCode = () =>
  apiFetch("/telegram/link-code", {
    method: "POST",
  });
