import { apiFetch } from "./client";

export const health = () => apiFetch("/health");
export const listInbox = () => apiFetch("/inbox");
export const getInboxItem = (id) => apiFetch(`/inbox/${id}`);

/*
export const createInboxItem = ({ source = "extension", title, content }) =>
  apiFetch("/inbox", {
    method: "POST",
    body: JSON.stringify({ source, title, content }),
  });
  */

/**
 * Crea un item en el inbox.
 * @param {Object} payload - Puede contener:
 * source (string), item_type (TEXT, YOUTUBE, IMAGE, PDF, WEB),
 * content (para TEXT), url (para YT, IMAGE, PDF, WEB),
 * file_base64 (para IMAGE, PDF), title (opcional)
 */
export const createInboxItem = (payload) =>
  apiFetch("/inbox", {
    method: "POST",
    body: JSON.stringify({
      source: payload.source || "extension",
      ...payload
    }),
  });

// Nuevo: Actualizar un item (PATCH)
export const updateInboxItem = (id, payload) =>
  apiFetch(`/inbox/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

// Nuevo: Eliminar un item (DELETE)
export const deleteInboxItem = (id) =>
  apiFetch(`/inbox/${id}`, {
    method: "DELETE",
  });