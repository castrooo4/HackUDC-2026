function widgetMarkup(label, logoUrl) {
  return `<img src="${logoUrl}" alt="Remit" class="remit-btn-icon remit-widget-icon" /><span class="remit-widget-text">${label}</span>`;
}

function injectWidget() {
  if (!document.body) return;
  if (document.getElementById("remit-universal-widget")) return;

  const isImagePage =
    document.contentType.startsWith("image/") ||
    (document.images.length === 1 && window.location.href.match(/\.(jpg|jpeg|png|gif|webp|svg)([\?#].*)?$/i));

  const label = isImagePage ? "Guardar Imagen" : "Guardar Web";
  const logoUrl = chrome.runtime.getURL("content_scripts/remit-logo.png");

  const btn = document.createElement("button");
  btn.id = "remit-universal-widget";
  btn.className = "remit-universal-widget";
  btn.innerHTML = widgetMarkup(label, logoUrl);
  btn.style.cssText = "display: flex !important; opacity: 1 !important; visibility: visible !important;";

  btn.onclick = (event) => {
    event.preventDefault();
    chrome.runtime.sendMessage({
      action: "SAVE_INBOX",
      url: window.location.href,
      isImageTab: isImagePage,
    });

    btn.innerHTML = '<span class="remit-check-icon">✓</span><span class="remit-widget-text">Guardado</span>';
    setTimeout(() => {
      btn.innerHTML = widgetMarkup(label, logoUrl);
    }, 2000);
  };

  document.body.appendChild(btn);
}

document.addEventListener("DOMContentLoaded", injectWidget);
[100, 500, 1000, 2000].forEach((delay) => setTimeout(injectWidget, delay));
