document.getElementById('saveBtn').addEventListener('click', () => {
  const content = document.getElementById('content').value.trim();
  const status = document.getElementById('status');

  // 1. Validación básica
  if (!content) {
    status.textContent = "¡Escribe o pega algo primero!";
    status.style.color = "#ff4444";
    return;
  }

  status.textContent = "Enviando...";
  status.style.color = "#aaa";

  let payload = { source: "extension" };

  // 2. El Detector Inteligente: Comprueba si empieza por http://, https:// o www.
  const isUrl = /^https?:\/\//i.test(content) || /^www\./i.test(content);

  if (isUrl) {
    // Si es un enlace, analizamos qué tipo de enlace es
    let itemType = "WEB";
    if (content.includes("youtube.com/watch") || content.includes("youtu.be/")) {
      itemType = "YOUTUBE";
    } else if (content.toLowerCase().endsWith(".pdf")) {
      itemType = "PDF";
    } else if (content.match(/\.(jpeg|jpg|gif|png)$/i)) {
      itemType = "IMAGE";
    }

    payload.item_type = itemType;
    payload.url = content; // Lo mandamos como URL
  } else {
    // Si no es un enlace, asumimos que es una nota rápida
    payload.item_type = "TEXT";
    payload.content = content; // Lo mandamos como content
  }

  // 3. Se lo pasamos al background.js
  chrome.runtime.sendMessage({ action: "SAVE_MANUAL", payload: payload }, (response) => {
    if (chrome.runtime.lastError) {
      status.textContent = "Error interno. Revisa la consola.";
      status.style.color = "#ff4444";
    } else {
      status.textContent = "¡✅ Guardado en Remit!";
      status.style.color = "#4CAF50";

      // Cerramos el popup automáticamente después de 1.5 segundos
      setTimeout(() => { window.close(); }, 1500);
    }
  });
});