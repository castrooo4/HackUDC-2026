function showRemitToast(message) {
  // Si el usuario guarda muy rápido, borramos el mensaje anterior para no apilarlos
  const existing = document.getElementById('remit-toast-container');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'remit-toast-container';
  toast.className = 'remit-toast';
  toast.innerHTML = `🧠 ${message}`;

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
    showRemitToast(request.message);
  }
});