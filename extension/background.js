// --- 1. FUNCIÓN CENTRAL PARA ENVIAR AL BACKEND ---
function sendToRemitBackend(payload) {
  console.log("Remit: Preparando envío al backend ->", payload);

  fetch("http://127.0.0.1:8000/inbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("El backend devolvió un error: " + response.status);
      }
      return response.json();
    })
    .then(data => {
      console.log(`Remit: ¡Éxito! Guardado en el backend.`, data);

      // --- MAGIA NUEVA: Mandamos la orden de mostrar el Toast a la pestaña activa ---
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "SHOW_TOAST",
            message: "¡Guardado en Remit!"
          });
        }
      });
      // -----------------------------------------------------------------------------
    })
    .catch(error => {
      console.error("Remit: Fallo al contactar con el backend.", error);
      // Opcional: Podrías mandar otro Toast rojo de error aquí
    });
}

// --- 2. ESCUCHADOR DE LOS BOTONES FLOTANTES (YouTube, Google) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SAVE_INBOX") {
    const url = request.url;
    let itemType = "WEB";

    if (request.action === "SAVE_MANUAL") {
      // Recibimos el payload ya construido por el popup y lo disparamos
      sendToRemitBackend(request.payload);
      sendResponse({ status: "Procesando envío manual" });
      return true;
    }

    if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) {
      itemType = "YOUTUBE";
    } else if (url.toLowerCase().endsWith(".pdf")) {
      itemType = "PDF";
    }

    sendToRemitBackend({
      source: "extension",
      item_type: itemType,
      url: url
    });

    sendResponse({ status: "Procesando en background" });
    return true;
  }
});

// --- 3. CONFIGURACIÓN DEL MENÚ CONTEXTUAL (Click Derecho) ---

// Se ejecuta una sola vez cuando instalas o actualizas la extensión
chrome.runtime.onInstalled.addListener(() => {
  // Opción para textos subrayados (Caso 1)
  chrome.contextMenus.create({
    id: "remit-save-text",
    title: "🧠 Guardar texto en Remit",
    contexts: ["selection"]
  });

  // Opción para enlaces (Caso 7 / Caso 5)
  chrome.contextMenus.create({
    id: "remit-save-link",
    title: "🧠 Guardar enlace en Remit",
    contexts: ["link"]
  });

  // Opción para imágenes (Caso 3)
  chrome.contextMenus.create({
    id: "remit-save-image",
    title: "🧠 Guardar imagen en Remit",
    contexts: ["image"]
  });

  // Opción para guardar la página en la que estás (Caso 7)
  chrome.contextMenus.create({
    id: "remit-save-page",
    title: "🧠 Guardar esta página en Remit",
    contexts: ["page"]
  });
});

// Lógica de lo que pasa cuando el usuario hace click en una opción del menú
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let payload = { source: "extension" };

  if (info.menuItemId === "remit-save-text") {
    payload.item_type = "TEXT";
    payload.content = info.selectionText;
  }
  else if (info.menuItemId === "remit-save-link") {
    const url = info.linkUrl;
    payload.item_type = url.toLowerCase().endsWith(".pdf") ? "PDF" : "WEB";
    payload.url = url;
  }
  else if (info.menuItemId === "remit-save-image") {
    payload.item_type = "IMAGE";
    payload.url = info.srcUrl;
  }
  else if (info.menuItemId === "remit-save-page") {
    payload.item_type = "WEB";
    payload.url = info.pageUrl;
  }

  // Si hemos construido un payload válido, lo disparamos
  if (payload.item_type) {
    sendToRemitBackend(payload);
  }
});

// --- FUNCIÓN MÁGICA PARA CONVERTIR A BASE64 ---
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

// --- CONFIGURACIÓN DEL MENÚ CONTEXTUAL (Click Derecho) ---
// (Si ya tenías los chrome.contextMenus.create de antes, déjalos intactos. 
//  Solo cambiamos la lógica del onClicked)

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let payload = { source: "extension" };

  if (tab.favIconUrl) payload.favicon_url = tab.favIconUrl;
  if (tab.title) payload.title = tab.title;

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
    // Si haces click derecho en el fondo de una foto abierta en pestaña nueva
    if (info.pageUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
      const base64data = await urlToBase64(info.pageUrl);
      if (base64data) {
        payload.item_type = "IMAGE";
        payload.file_base64 = base64data; // ¡USAMOS TU CASO 4!
        sendToRemitBackend(payload);
      }
    } else {
      payload.item_type = "WEB";
      payload.url = info.pageUrl;
      sendToRemitBackend(payload);
    }
  }
  else if (info.menuItemId === "remit-save-image") {
    // Si haces click derecho directamente SOBRE una foto
    const base64data = await urlToBase64(info.srcUrl);
    if (base64data) {
      payload.item_type = "IMAGE";
      payload.file_base64 = base64data; // ¡USAMOS TU CASO 4!
      sendToRemitBackend(payload);
    } else {
      // Plan B: Si el Base64 falla, mandamos la URL (Caso 3)
      payload.item_type = "IMAGE";
      payload.url = info.srcUrl;
      sendToRemitBackend(payload);
    }
  }
});

console.log("Remit: Background Service Worker iniciado con Menú Contextual.");


