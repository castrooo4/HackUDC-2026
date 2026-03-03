const FALLBACK_API_BASE = "https://remit-db.mintos.space";
const FALLBACK_REMIT_EVENT_SOURCE = "remit-webapp";
const FALLBACK_GEOLOCATION_TIMEOUT_MS = 8000;
const FALLBACK_MAP_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const FALLBACK_MAP_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const ENV = {
  API_BASE: (import.meta.env.VITE_API_BASE ?? FALLBACK_API_BASE).replace(/\/+$/, ""),
  REMIT_EVENT_SOURCE: import.meta.env.VITE_REMIT_EVENT_SOURCE ?? FALLBACK_REMIT_EVENT_SOURCE,
  GEOLOCATION_TIMEOUT_MS: toNumber(import.meta.env.VITE_GEOLOCATION_TIMEOUT_MS, FALLBACK_GEOLOCATION_TIMEOUT_MS),
  MAP_TILE_URL: import.meta.env.VITE_MAP_TILE_URL ?? FALLBACK_MAP_TILE_URL,
  MAP_TILE_ATTRIBUTION: import.meta.env.VITE_MAP_TILE_ATTRIBUTION ?? FALLBACK_MAP_TILE_ATTRIBUTION,
};
