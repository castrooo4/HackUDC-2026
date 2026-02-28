import { apiFetch } from "./client";

export const health = () => apiFetch("/health");
export const listInbox = () => apiFetch("/inbox");
export const getInboxItem = (id) => apiFetch(`/inbox/${id}`);

export const createInboxItem = (payload) =>
  apiFetch("/inbox", {
    method: "POST",
    body: JSON.stringify({
      source: payload.source || "extension",
      ...payload,
    }),
  });

export const updateInboxItem = (id, payload) =>
  apiFetch(`/inbox/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteInboxItem = (id) =>
  apiFetch(`/inbox/${id}`, {
    method: "DELETE",
  });

export const getPendingInbox = () => apiFetch("/inbox?status=PROCESSED");
export const getOrganizedInbox = () => apiFetch("/inbox?status=ORGANIZED");
export const getDirectoriesTree = () => apiFetch("/directories/tree");

export const confirmOrganization = (itemId, option) => {
  let payload = {};
  if (option.type === "EXISTING") {
    payload = { directory_id: option.id };
  } else if (option.type === "NEW") {
    payload = { directory_name: option.name };
  }

  return apiFetch(`/inbox/${itemId}/confirm-organization`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const listCities = () => apiFetch("/inbox/cities");
export const listInboxByCity = (city) => apiFetch(`/inbox/cities/${encodeURIComponent(city)}/items`);
