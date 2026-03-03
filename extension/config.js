/* Global config shared by popup and background */
(function registerRemitConfig(scope) {
  const PRESETS = {
    local: {
      API_BASE_URL: "http://127.0.0.1:8000",
      WEB_APP_URL: "http://localhost:5173",
    },
    production: {
      API_BASE_URL: "https://remit-db.mintos.space",
      WEB_APP_URL: "https://remit.mintos.space/",
    },
  };

  const ACTIVE_ENV = "local";

  scope.REMIT_CONFIG = {
    ...PRESETS[ACTIVE_ENV],
    GEO_IP_URL: "https://get.geojs.io/v1/ip/geo.json",
    EVENT_SOURCE: "remit-webapp",
    ACTIVE_ENV,
  };
})(typeof self !== "undefined" ? self : window);
