const API_URL = "http://127.0.0.1:8000";

const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  USE_LOCATION: "use_location",
};

const VIEWS = {
  AUTH: "authView",
  MAIN: "mainView",
};

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

function showView(viewId) {
  el(VIEWS.AUTH).classList.add("hidden");
  el(VIEWS.MAIN).classList.add("hidden");
  el(viewId).classList.remove("hidden");
}

async function initializeView() {
  const data = await getStorage([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.USE_LOCATION]);
  showView(data.access_token ? VIEWS.MAIN : VIEWS.AUTH);

  const locationToggle = el("locationToggle");
  if (locationToggle) {
    locationToggle.checked = Boolean(data.use_location);
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
    setStatus("⚠️ Email y contrasena requeridos");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok || !data?.access_token) {
      setStatus("❌ Credenciales incorrectas");
      return;
    }

    await setStorage({ [STORAGE_KEYS.ACCESS_TOKEN]: data.access_token });
    setStatus("✅ Sesion iniciada");
    setTimeout(() => showView(VIEWS.MAIN), 500);
  } catch (_error) {
    setStatus("❌ Error de conexion con el servidor");
  }
}

async function register() {
  const email = el("regEmail").value.trim();
  const password = el("regPass").value.trim();
  const full_name = el("regName").value.trim();

  if (!email || !password || !full_name) {
    setStatus("⚠️ Todos los campos son obligatorios");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name }),
    });

    const data = await response.json();
    if (!response.ok) {
      if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
        setStatus(`❌ Error: ${data.detail[0].msg}`);
      } else {
        setStatus(`❌ ${data?.detail || "Error al registrar"}`);
      }
      return;
    }

    setStatus("✅ Cuenta creada. Ya puedes iniciar sesion.");
    setTimeout(() => el("toLogin").click(), 1200);
  } catch (_error) {
    setStatus("❌ Error de conexion");
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
    setStatus(event.target.checked ? "✅ Ubicacion activada" : "Ubicacion desactivada");
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
  chrome.runtime.sendMessage(payload);
}

function bindSaveActions() {
  el("saveBtn").addEventListener("click", () => {
    const content = el("content").value.trim();
    if (!content) {
      setStatus("⚠️ Escribe algo primero.");
      return;
    }

    setStatus("✅ Enviando...");
    const type = detectItemTypeFromContent(content);

    if (type === "TEXT") {
      sendSaveMessage({
        action: "SAVE_MANUAL",
        payload: { source: "extension", item_type: "TEXT", content },
      });
    } else {
      sendSaveMessage({ action: "SAVE_INBOX", url: content });
    }

    setTimeout(() => window.close(), 800);
  });

  el("autoSaveBtn").addEventListener("click", () => {
    setStatus("✅ Pestana guardada");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.[0]?.url) return;
      sendSaveMessage({ action: "SAVE_INBOX", url: tabs[0].url });
      setTimeout(() => window.close(), 800);
    });
  });

  el("screenshotBtn").addEventListener("click", () => {
    sendSaveMessage({ action: "INIT_SCREENSHOT" });
    window.close();
  });

  el("openWebBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:5173" });
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
