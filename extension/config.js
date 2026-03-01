/* Global config shared by popup and background */
(function registerRemitConfig(scope) {
  const PRESETS = {
    local: {
      API_BASE_URL: "http://127.0.0.1:8000",
      WEB_APP_URL: "http://127.0.0.1:5173",
    },
    production: {
      API_BASE_URL: "https://remit-db.mintos.space",
      WEB_APP_URL: "http://remit.mintos.space/",
    },
  };

  // Cambia aqui el modo de la extension: "local" o "production"
  const ACTIVE_ENV = "local";

  scope.REMIT_CONFIG = {
    ...PRESETS[ACTIVE_ENV],
    GEO_IP_URL: "https://get.geojs.io/v1/ip/geo.json",
    ACTIVE_ENV,
  };
})(typeof self !== "undefined" ? self : window);
