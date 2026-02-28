console.log("%c[REMIT SYNC] 🕵️‍♂️ Espía bidireccional activado", "color: #9C27B0; font-weight: bold; font-size: 14px;");

// =========================================================================
// 1. DIRECCIÓN: WEB -> EXTENSIÓN 
// =========================================================================
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type === "REMIT_LOGIN_SUCCESS" && event.data.token) {
    chrome.storage.local.get(['access_token'], (data) => {
      if (data.access_token !== event.data.token) {
        chrome.storage.local.set({ access_token: event.data.token }, () => {
          console.log("%c[WEB -> EXT] ✅ Token copiado a la extensión.", "color: #4CAF50;");
        });
      }
    });
  }

  if (event.data.type === "REMIT_LOGOUT") {
    chrome.storage.local.remove(['access_token'], () => {
      console.log("%c[WEB -> EXT] 🚪 Sesión cerrada en la extensión.", "color: #f44336;");
    });
  }
});

// =========================================================================
// 2. DIRECCIÓN: EXTENSIÓN -> WEB (El Walkie-Talkie Corregido)
// =========================================================================
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local') return;

  // === CASOS A y B: Inicios y cierres de sesión ===
  if (changes.access_token) {
    const newToken = changes.access_token.newValue;
    const currentWebToken = localStorage.getItem('token');

    if (newToken && newToken !== currentWebToken) {
      console.log("%c[EXT -> WEB] 🔄 Inyectando sesión en la web...", "color: #2196F3; font-weight:bold;");
      localStorage.setItem('token', newToken);
      window.location.reload();
    }
    else if (!newToken && currentWebToken) {
      console.log("%c[EXT -> WEB] 🚪 Forzando logout en la web...", "color: #FF9800; font-weight:bold;");
      localStorage.removeItem('token');
      window.location.reload();
    }
  }

  // === CASO C: La IA de la extensión acaba de guardar algo ===
  // (Ahora está libre y se ejecutará siempre que guardes)
  if (changes.remit_last_saved) {
    console.log("%c[EXT -> WEB] 📢 Nuevo elemento guardado, avisando a la web...", "color: #FFEB3B; font-weight:bold;");
    window.postMessage({ type: "REMIT_NEW_ITEM" }, "*");
  }
});