import { apiFetch } from "./client";

export const health = () => apiFetch("/health");
export const listInbox = () => apiFetch("/inbox");
export const getInboxItem = (id) => apiFetch(`/inbox/${id}`);
export const createInboxItem = ({ source = "extension", title, content }) =>
  apiFetch("/inbox", {
    method: "POST",
    body: JSON.stringify({ source, title, content }),
  });