function showRemitToast(message, type = "success") {
  // Si el usuario guarda muy rápido, borramos el mensaje anterior para no apilarlos
  const existing = document.getElementById('remit-toast-container');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'remit-toast-container';
  toast.className = 'remit-toast';

  // Magia nueva: Si el background nos dice que es un error, le ponemos la clase roja
  if (type === "error") {
    toast.classList.add('remit-toast-error');
    // Usamos el mensaje tal cual (que ya incluye el icono ⚠️ del background)
    toast.innerHTML = message;
  } else {
    // Si es éxito normal, le ponemos el cerebro
    toast.innerHTML = `🧠 ${message}`;
  }

  document.body.appendChild(toast);

  // Un pequeño truco (reflow) para que la animación CSS se dispare correctamente
  requestAnimationFrame(() => {
    toast.classList.add('remit-show');
  });

  // A los 3 segundos, lo ocultamos y lo eliminamos del código
  setTimeout(() => {
    toast.classList.remove('remit-show');
    setTimeout(() => toast.remove(), 300); // Esperamos a que termine la animación de salida
  }, 3000);
}

// Quedamos a la espera de que el background nos dé la orden de mostrar el aviso
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SHOW_TOAST") {
    // Le pasamos a la función tanto el mensaje como el tipo (error o éxito)
    showRemitToast(request.message, request.type);
  }
});

window.addEventListener("message", (event) => {
  // Verificamos que el mensaje venga de nuestra propia pestaña y tenga la etiqueta correcta
  if (event.source === window && event.data.type === "REMIT_WEB_TOAST") {
    showRemitToast(event.data.message, event.data.toastType);
  }
});