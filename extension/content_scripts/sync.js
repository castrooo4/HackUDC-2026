window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type === "REMIT_LOGIN_SUCCESS" && event.data.token) {
    chrome.storage.local.get(["access_token"], (data) => {
      if (data.access_token !== event.data.token) {
        chrome.storage.local.set({ access_token: event.data.token });
      }
    });
  }

  if (event.data.type === "REMIT_LOGOUT") {
    chrome.storage.local.remove(["access_token"]);
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "local") return;

  if (changes.access_token) {
    const newToken = changes.access_token.newValue;
    const currentWebToken = localStorage.getItem("token");

    if (newToken && newToken !== currentWebToken) {
      localStorage.setItem("token", newToken);
      window.location.reload();
    } else if (!newToken && currentWebToken) {
      localStorage.removeItem("token");
      window.location.reload();
    }
  }

  if (changes.remit_last_saved) {
    window.postMessage({ type: "REMIT_NEW_ITEM" }, "*");
  }
});
