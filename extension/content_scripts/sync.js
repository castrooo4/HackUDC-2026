console.log("%c[REMIT SYNC] 🕵️‍♂️ Espía bidireccional activado", "color: #9C27B0; font-weight: bold; font-size: 14px;");

// =========================================================================
// 1. DIRECCIÓN: WEB -> EXTENSIÓN (Lo que ya funcionaba)
// =========================================================================
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type === "REMIT_LOGIN_SUCCESS" && event.data.token) {
    // Comprobamos si ya lo tenemos para evitar bucles infinitos
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
// 2. DIRECCIÓN: EXTENSIÓN -> WEB (¡La magia nueva!)
// =========================================================================
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.access_token) {
    const newToken = changes.access_token.newValue;
    const currentWebToken = localStorage.getItem('token');

    // CASO A: Hemos iniciado sesión desde el Popup de la extensión
    if (newToken && newToken !== currentWebToken) {
      console.log("%c[EXT -> WEB] 🔄 Inyectando sesión en la web...", "color: #2196F3; font-weight:bold;");

      // El content script comparte el localStorage con la web, ¡así que lo escribimos directo!
      localStorage.setItem('token', newToken);

      // Recargamos la pestaña suavemente para que tu frontend (React/Vite) detecte el cambio
      window.location.reload();
    }
    // CASO B: Hemos cerrado sesión desde el Popup de la extensión
    else if (!newToken && currentWebToken) {
      console.log("%c[EXT -> WEB] 🚪 Forzando logout en la web...", "color: #FF9800; font-weight:bold;");
      localStorage.removeItem('token');
      window.location.reload();
    }
  }
});