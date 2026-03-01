const FALLBACK_API_BASE = "https://remit-db.mintos.space";

export const ENV = {
  API_BASE: (import.meta.env.VITE_API_BASE ?? FALLBACK_API_BASE).replace(/\/+$/, ""),
};

