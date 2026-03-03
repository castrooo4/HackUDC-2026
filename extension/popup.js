const API_URL = window.REMIT_CONFIG?.API_BASE_URL ?? "https://remit-db.mintos.space";

const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  USE_LOCATION: "use_location",
};

const VIEWS = {
  AUTH: "authView",
  MAIN: "mainView",
};
const PASSWORD_MIN_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function el(id) {
  return document.getElementById(id);
}

async function getStorage(keys) {
  return chrome.storage.local.get(keys);
}

async function setStorage(data) {
  return chrome.storage.local.set(data);
}

async function removeStorage(keys) {
  return chrome.storage.local.remove(keys);
}

function setStatus(message) {
  const status = el("status");
  if (status) status.textContent = message;
}

function parseApiError(data, fallbackMessage) {
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail.trim();
  }
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const firstError = data.errors[0];
    if (typeof firstError?.message === "string" && firstError.message.trim()) {
      return firstError.message.trim();
    }
  }
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    const first = data.detail[0];
    if (typeof first?.msg === "string" && first.msg.trim()) {
      return first.msg.trim();
    }
  }
  return fallbackMessage;
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

function showView(viewId) {
  el(VIEWS.AUTH).classList.add("hidden");
  el(VIEWS.MAIN).classList.add("hidden");
  el(viewId).classList.remove("hidden");
}

async function initializeView() {
  const data = await getStorage([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.USE_LOCATION]);
  showView(data[STORAGE_KEYS.ACCESS_TOKEN] ? VIEWS.MAIN : VIEWS.AUTH);

  const locationToggle = el("locationToggle");
  if (locationToggle) {
    locationToggle.checked = Boolean(data[STORAGE_KEYS.USE_LOCATION]);
  }
}

function bindAuthViewToggles() {
  el("toRegister").onclick = () => {
    el("loginForm").classList.add("hidden");
    el("registerForm").classList.remove("hidden");
  };

  el("toLogin").onclick = () => {
    el("registerForm").classList.add("hidden");
    el("loginForm").classList.remove("hidden");
  };
}

async function login() {
  const email = el("loginEmail").value.trim();
  const password = el("loginPass").value.trim();

  if (!email || !password) {
    setStatus("Email y contrasena requeridos");
    return;
  }
  if (!EMAIL_REGEX.test(email)) {
    setStatus("Introduce un email valido");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await readJsonSafely(response);
    if (!response.ok || !data?.access_token) {
      setStatus(parseApiError(data, "Credenciales incorrectas"));
      return;
    }

    await setStorage({ [STORAGE_KEYS.ACCESS_TOKEN]: data.access_token });
    setStatus("Sesion iniciada");
    setTimeout(() => showView(VIEWS.MAIN), 500);
  } catch (_error) {
    setStatus("Error de conexion con el servidor");
  }
}

async function register() {
  const email = el("regEmail").value.trim();
  const password = el("regPass").value.trim();
  const fullName = el("regName").value.trim();

  if (!email || !password || !fullName) {
    setStatus("Todos los campos son obligatorios");
    return;
  }
  if (!EMAIL_REGEX.test(email)) {
    setStatus("Introduce un email valido");
    return;
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    setStatus(`La contrasena debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`);
    return;
  }
  if (fullName.length < 2) {
    setStatus("El nombre debe tener al menos 2 caracteres");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });

    const data = await readJsonSafely(response);
    if (!response.ok) {
      setStatus(parseApiError(data, "Error al registrar"));
      return;
    }

    setStatus("Cuenta creada. Ya puedes iniciar sesion.");
    setTimeout(() => el("toLogin").click(), 1200);
  } catch (_error) {
    setStatus("Error de conexion");
  }
}

async function logout() {
  await removeStorage([STORAGE_KEYS.ACCESS_TOKEN]);
  setStatus("Sesion cerrada");
  showView(VIEWS.AUTH);
}

function bindLocationToggle() {
  const locationToggle = el("locationToggle");
  if (!locationToggle) return;

  locationToggle.addEventListener("change", async (event) => {
    await setStorage({ [STORAGE_KEYS.USE_LOCATION]: event.target.checked });
    setStatus(event.target.checked ? "Ubicacion activada" : "Ubicacion desactivada");
  });
}

function detectItemTypeFromContent(content) {
  const lower = content.toLowerCase();
  if (content.startsWith("data:image/")) return "IMAGE";
  if (content.startsWith("data:application/pdf")) return "PDF";
  if (lower.includes("youtube.com/") || lower.includes("youtu.be/")) return "YOUTUBE";
  if (lower.endsWith(".pdf")) return "PDF";
  if (lower.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) return "IMAGE";
  if (content.startsWith("http")) return "WEB";
  return "TEXT";
}

function sendSaveMessage(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ status: "error", message: chrome.runtime.lastError.message || "Error en extension" });
        return;
      }
      resolve(response || { status: "error", message: "Sin respuesta del background" });
    });
  });
}

function bindSaveActions() {
  el("saveBtn").addEventListener("click", async () => {
    const content = el("content").value.trim();
    if (!content) {
      setStatus("Escribe algo primero");
      return;
    }

    setStatus("Enviando...");
    const type = detectItemTypeFromContent(content);
    let result;

    if (type === "TEXT") {
      result = await sendSaveMessage({
        action: "SAVE_MANUAL",
        payload: { source: "extension", item_type: "TEXT", content },
      });
    } else {
      result = await sendSaveMessage({ action: "SAVE_INBOX", url: content });
    }

    if (result?.status === "ok") {
      setStatus(result.message || "Guardado");
      setTimeout(() => window.close(), 1000);
      return;
    }

    setStatus(result?.message || "Error guardando");
  });

  el("autoSaveBtn").addEventListener("click", () => {
    setStatus("Guardando pestana...");
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs?.[0]?.url) return;
      const result = await sendSaveMessage({ action: "SAVE_INBOX", url: tabs[0].url });
      if (result?.status === "ok") {
        setStatus(result.message || "Guardado");
        setTimeout(() => window.close(), 1000);
        return;
      }
      setStatus(result?.message || "Error guardando");
    });
  });

  el("screenshotBtn").addEventListener("click", () => {
    sendSaveMessage({ action: "INIT_SCREENSHOT" });
    window.close();
  });

  el("openWebBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: window.REMIT_CONFIG?.WEB_APP_URL ?? "http://localhost:5173" });
    window.close();
  });

  el("cameraBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: "camera.html" });
    window.close();
  });
}

function bindEnterShortcuts() {
  const triggerOnEnter = (inputId, buttonId) => {
    el(inputId).addEventListener("keypress", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      el(buttonId).click();
    });
  };

  triggerOnEnter("loginEmail", "loginBtn");
  triggerOnEnter("loginPass", "loginBtn");
  triggerOnEnter("regPass", "registerBtn");
}

function bindButtons() {
  el("loginBtn").onclick = login;
  el("registerBtn").onclick = register;
  el("logoutBtn").onclick = logout;
}

document.addEventListener("DOMContentLoaded", async () => {
  await initializeView();
  bindAuthViewToggles();
  bindButtons();
  bindLocationToggle();
  bindSaveActions();
  bindEnterShortcuts();
});

