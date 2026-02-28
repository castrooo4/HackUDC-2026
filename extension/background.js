// --- 1. FUNCIÓN CENTRAL PARA ENVIAR AL BACKEND ---
async function sendToRemitBackend(payload) {
  const data = await chrome.storage.local.get(['access_token']);
  const token = data.access_token;

  // --- LA MAGIA DEL AVISO VISUAL ---
  if (!token) {
    console.warn("Remit: Intento de guardado sin iniciar sesión.");

    // Buscamos la pestaña donde está el usuario y le disparamos el Toast rojo
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "SHOW_TOAST",
          message: "⚠️ Inicia sesión en Remit para guardar",
          type: "error" // Indicamos que use el estilo rojo
        });
      }
    });
    return; // Detenemos la ejecución para que no haga el fetch
  }

  // ... (Aquí sigue tu código normal del fetch con el Authorization: Bearer) ...
  fetch("http://127.0.0.1:8000/inbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
  // ... resto del fetch ...
}
// --- 2. FUNCIÓN MÁGICA PARA CONVERTIR A BASE64 ---
async function urlToBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Remit: Error al convertir a Base64", error);
    return null;
  }
}

// --- 3. ESCUCHADOR DE LA EXTENSIÓN (Botones, Popup) ---
// --- ESCUCHADOR DE LA EXTENSIÓN (Botones, Popup, Widget) ---
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "SAVE_MANUAL") {
    sendToRemitBackend(request.payload);
    sendResponse({ status: "ok" });
    return true;
  }

  if (request.action === "SAVE_INBOX") {
    const url = request.url;
    let payload = { source: "extension", url: url };

    // 1. Si es YouTube
    if (url.includes("youtube.com/watch") || url.includes("youtu.be/") || url.includes("/shorts/")) {
      payload.item_type = "YOUTUBE";
    }
    // 2. Si es una pestaña de imagen (¡LA MAGIA NUEVA!)
    else if (request.isImageTab || url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
      payload.item_type = "IMAGE";
      // Intentamos pasarla a Base64 para que el backend la reciba procesada
      const base64 = await urlToBase64(url);
      if (base64) {
        payload.file_base64 = base64;
        delete payload.url; // Si mandamos el archivo, no hace falta la URL
      }
    }
    // 3. Si es un PDF
    else if (url.toLowerCase().endsWith(".pdf")) {
      payload.item_type = "PDF";
    }
    // 4. Por defecto: WEB
    else {
      payload.item_type = "WEB";
    }

    sendToRemitBackend(payload);
    sendResponse({ status: "ok" });
    return true;
  }

  // Dentro de tu chrome.runtime.onMessage.addListener
  if (request.action === "INIT_SCREENSHOT") {
    console.log("Remit: Iniciando captura de pantalla...");

    // Esperamos un pelín a que el popup se cierre del todo
    setTimeout(() => {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error("Error capturando pestaña:", chrome.runtime.lastError.message);
          return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            console.log("Remit: Enviando imagen al content script del tab:", tabs[0].id);
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "START_CROP_UI",
              image: dataUrl
            });
          }
        });
      });
    }, 300); // 300ms de cortesía
    return true;
  }
});
// --- 4. CONFIGURACIÓN DEL MENÚ CONTEXTUAL (Click Derecho) ---

// Crear las opciones en el menú
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "remit-save-text",
    title: "🧠 Guardar texto en Remit",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "remit-save-link",
    title: "🧠 Guardar enlace en Remit",
    contexts: ["link"]
  });
  chrome.contextMenus.create({
    id: "remit-save-image",
    title: "🧠 Guardar imagen en Remit",
    contexts: ["image"]
  });
  chrome.contextMenus.create({
    id: "remit-save-page",
    title: "🧠 Guardar esta página en Remit",
    contexts: ["page"]
  });
});

// Lógica de click derecho limpia (Sin llamadas dobles)
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let payload = { source: "extension" };

  // Ignoramos favicon, ya que el backend se encarga

  if (info.menuItemId === "remit-save-text") {
    payload.item_type = "TEXT";
    payload.content = info.selectionText;
    sendToRemitBackend(payload);
  }
  else if (info.menuItemId === "remit-save-link") {
    const url = info.linkUrl;
    payload.item_type = url.toLowerCase().endsWith(".pdf") ? "PDF" : "WEB";
    payload.url = url;
    sendToRemitBackend(payload);
  }
  else if (info.menuItemId === "remit-save-page") {
    if (info.pageUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
      const base64data = await urlToBase64(info.pageUrl);
      if (base64data) {
        payload.item_type = "IMAGE";
        payload.file_base64 = base64data;
        sendToRemitBackend(payload);
      }
    } else {
      payload.item_type = "WEB";
      payload.url = info.pageUrl;
      sendToRemitBackend(payload);
    }
  }
  else if (info.menuItemId === "remit-save-image") {
    const base64data = await urlToBase64(info.srcUrl);
    if (base64data) {
      payload.item_type = "IMAGE";
      payload.file_base64 = base64data;
      sendToRemitBackend(payload);
    } else {
      payload.item_type = "IMAGE";
      payload.url = info.srcUrl;
      sendToRemitBackend(payload);
    }
  }
});

console.log("Remit: Background Service Worker iniciado y limpio.");