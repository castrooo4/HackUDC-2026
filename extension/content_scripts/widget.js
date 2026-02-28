function injectWidget() {
  if (!document.body) return; // Asegurar que el body existe
  if (document.getElementById('remit-universal-widget')) return;

  // Detección: pestaña de imagen directa o un simple visor de medios
  const isImagePage = document.contentType.startsWith("image/") ||
    (document.images.length === 1 && window.location.href.match(/\.(jpg|jpeg|png|gif|webp|svg)([\?#].*)?$/i));

  const label = isImagePage ? "Guardar Imagen" : "Guardar Web";

  // Creamos el botón
  const btn = document.createElement('button');
  btn.id = 'remit-universal-widget';
  btn.className = 'remit-universal-widget';

  btn.innerHTML = `🧠 <span class="remit-widget-text">${label}</span>`;

  // Estilo forzado para que no lo tape el fondo negro de Chrome
  btn.style.cssText = "display: flex !important; opacity: 1 !important; visibility: visible !important;";

  btn.onclick = (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({
      action: "SAVE_INBOX",
      url: window.location.href,
      isImageTab: isImagePage
    });
    btn.innerHTML = '✅ <span class="remit-widget-text">¡Guardado!</span>';
    setTimeout(() => { btn.innerHTML = `🧠 <span class="remit-widget-text">${label}</span>`; }, 2000);
  };

  document.body.appendChild(btn);
}

// Intentar inyectar cuando el DOM esté listo o en varios pasos por si acaso
document.addEventListener('DOMContentLoaded', injectWidget);
[100, 500, 1000, 2000].forEach(delay => setTimeout(injectWidget, delay));