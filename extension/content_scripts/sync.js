const REMIT_EVENT_SOURCE = window.REMIT_CONFIG?.EVENT_SOURCE ?? "remit-webapp";
const EXTENSION_EVENT_SOURCE = "remit-extension";

const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  LAST_SAVED_AT: "remit_last_saved",
};

function isTrustedRemitEvent(event) {
  if (event.source !== window) return false;
  const data = event.data;
  if (!data || typeof data !== "object") return false;
  return data.source === REMIT_EVENT_SOURCE && typeof data.type === "string";
}

window.addEventListener("message", (event) => {
  if (!isTrustedRemitEvent(event)) return;

  if (event.data.type === "REMIT_LOGIN_SUCCESS" && typeof event.data.token === "string") {
    chrome.storage.local.get([STORAGE_KEYS.ACCESS_TOKEN], (data) => {
      if (data[STORAGE_KEYS.ACCESS_TOKEN] !== event.data.token) {
        chrome.storage.local.set({ [STORAGE_KEYS.ACCESS_TOKEN]: event.data.token });
      }
    });
  }

  if (event.data.type === "REMIT_LOGOUT") {
    chrome.storage.local.remove([STORAGE_KEYS.ACCESS_TOKEN]);
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "local") return;

  if (changes[STORAGE_KEYS.ACCESS_TOKEN]) {
    const newToken = changes[STORAGE_KEYS.ACCESS_TOKEN].newValue;
    const currentWebToken = localStorage.getItem("token");

    if (newToken && newToken !== currentWebToken) {
      localStorage.setItem("token", newToken);
      window.location.reload();
    } else if (!newToken && currentWebToken) {
      localStorage.removeItem("token");
      window.location.reload();
    }
  }

  if (changes[STORAGE_KEYS.LAST_SAVED_AT]) {
    window.postMessage({ source: EXTENSION_EVENT_SOURCE, type: "REMIT_NEW_ITEM" }, "*");
  }
});
