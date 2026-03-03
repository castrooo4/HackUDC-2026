function showRemitToast(message, type = "success") {
  const existing = document.getElementById("remit-toast-container");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "remit-toast-container";
  toast.className = "remit-toast";

  const safeMessage = String(message ?? "");
  toast.textContent = type === "error" ? safeMessage : `Remit ${safeMessage}`;

  if (type === "error") {
    toast.classList.add("remit-toast-error");
  }

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("remit-show");
  });

  setTimeout(() => {
    toast.classList.remove("remit-show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "SHOW_TOAST") {
    showRemitToast(request.message, request.type);
  }
});

window.addEventListener("message", (event) => {
  if (event.source === window && event.data.type === "REMIT_WEB_TOAST") {
    showRemitToast(event.data.message, event.data.toastType);
  }
});
