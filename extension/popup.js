// --- FUNCIONAMIENTO DEL POPUP REMIT ---

// 1. Botón: ENVIAR MANUAL (Texto/URL del área de texto)
document.getElementById('saveBtn').addEventListener('click', () => {
  const content = document.getElementById('content').value.trim();
  const status = document.getElementById('status');

  if (!content) {
    status.textContent = "⚠️ Escribe algo primero.";
    return;
  }

  // Detectamos si es URL o Texto
  let payload = { source: "extension" };
  if (content.startsWith('http')) {
    chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: content });
  } else {
    payload.item_type = "TEXT";
    payload.content = content;
    chrome.runtime.sendMessage({ action: "SAVE_MANUAL", payload: payload });
  }

  status.textContent = "✅ Enviado";
  setTimeout(() => window.close(), 1000);
});

// 2. Botón: GUARDAR ESTA PESTAÑA (Automático)
document.getElementById('autoSaveBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: tabs[0].url });
      document.getElementById('status').textContent = "✅ Pestaña guardada";
      setTimeout(() => window.close(), 1000);
    }
  });
});

// 3. Botón: RECORTAR Y GUARDAR
document.getElementById('screenshotBtn').addEventListener('click', () => {
  // Enviamos la orden al background y cerramos el popup para que no estorbe
  chrome.runtime.sendMessage({ action: "INIT_SCREENSHOT" });
  window.close();
});