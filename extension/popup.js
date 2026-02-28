const API_URL = "http://127.0.0.1:8000";

// --- INICIO: CONTROL DE VISTAS ---
document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get(['access_token']);
  if (data.access_token) {
    showView('mainView');
  } else {
    showView('authView');
  }
});

function showView(viewId) {
  document.getElementById('authView').classList.add('hidden');
  document.getElementById('mainView').classList.add('hidden');
  document.getElementById(viewId).classList.remove('hidden');
}

// Switch entre login y registro
document.getElementById('toRegister').onclick = () => {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('registerForm').classList.remove('hidden');
};
document.getElementById('toLogin').onclick = () => {
  document.getElementById('registerForm').classList.add('hidden');
  document.getElementById('loginForm').classList.remove('hidden');
};

// --- LÓGICA DE LOGIN ---
document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value.trim();
  const status = document.getElementById('status');

  if (!email || !password) {
    status.textContent = "⚠️ Email y contraseña requeridos";
    return;
  }

  try {
    // Intentamos login con JSON (según tu README)
    const resp = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await resp.json();

    if (resp.ok) {
      await chrome.storage.local.set({ access_token: data.access_token });
      status.textContent = "✅ Sesión iniciada";
      setTimeout(() => showView('mainView'), 500);
    } else {
      console.error("Error Login:", data.detail);
      status.textContent = "❌ Credenciales incorrectas";
    }
  } catch (e) {
    status.textContent = "❌ Error de conexión con el servidor";
  }
};

// --- ESCUCHAR LA TECLA ENTER PARA EL LOGIN ---
const handleLoginEnter = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault(); // Evita que el formulario recargue la página por defecto
    document.getElementById('loginBtn').click(); // Simula un clic en tu botón de Entrar
  }
};

// Se lo aplicamos a los campos de email y contraseña del login
document.getElementById('loginEmail').addEventListener('keypress', handleLoginEnter);
document.getElementById('loginPass').addEventListener('keypress', handleLoginEnter);

// (Opcional) Lo hacemos también para el último campo del registro
document.getElementById('regPass').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('registerBtn').click();
  }
});

// --- LÓGICA DE REGISTRO (Corregida para depurar el 422) ---
document.getElementById('registerBtn').onclick = async () => {
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value.trim();
  const full_name = document.getElementById('regName').value.trim();
  const status = document.getElementById('status');

  if (!email || !password || !full_name) {
    status.textContent = "⚠️ Todos los campos son obligatorios";
    return;
  }

  try {
    const resp = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name })
    });

    const data = await resp.json();

    if (resp.ok) {
      status.textContent = "✅ ¡Cuenta creada! Ya puedes entrar.";
      setTimeout(() => document.getElementById('toLogin').click(), 1500);
    } else {
      // Si hay error 422, esto imprimirá en la consola qué campo está mal
      console.error("Detalle del error 422:", data.detail);

      if (Array.isArray(data.detail)) {
        status.textContent = `❌ Error: ${data.detail[0].msg}`;
      } else {
        status.textContent = `❌ ${data.detail || "Error al registrar"}`;
      }
    }
  } catch (e) {
    status.textContent = "❌ Error de conexión";
  }
};

// --- LOGOUT ---
document.getElementById('logoutBtn').onclick = async () => {
  await chrome.storage.local.remove(['access_token']);
  document.getElementById('status').textContent = "Sesión cerrada";
  showView('authView');
};
// --- LÓGICA DE UBICACIÓN ---
const locToggle = document.getElementById('locationToggle');

// 1. Al abrir, miramos si lo tenías encendido
chrome.storage.local.get(['use_location'], (data) => {
  if (locToggle) locToggle.checked = !!data.use_location;
});

// 2. Si lo tocas, simplemente guarda la preferencia
if (locToggle) {
  locToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ use_location: e.target.checked });
    document.getElementById('status').textContent = e.target.checked ? "✅ Ubicación activada" : "Ubicación desactivada";
  });
}

// --- BOTONES DE GUARDADO ---
document.getElementById('saveBtn').addEventListener('click', () => {
  const content = document.getElementById('content').value.trim();
  const status = document.getElementById('status');

  if (!content) {
    status.textContent = "⚠️ Escribe algo primero.";
    return;
  }

  status.textContent = "✅ Enviando...";

  if (content.startsWith('http')) {
    chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: content });
  } else {
    chrome.runtime.sendMessage({ action: "SAVE_MANUAL", payload: { source: "extension", item_type: "TEXT", content: content } });
  }
  setTimeout(() => window.close(), 800);
});

document.getElementById('autoSaveBtn').addEventListener('click', () => {
  document.getElementById('status').textContent = "✅ Pestaña guardada";
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: tabs[0].url });
      setTimeout(() => window.close(), 800);
    }
  });
});

document.getElementById('screenshotBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: "INIT_SCREENSHOT" });
  window.close();
});

document.getElementById('openWebBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: "http://localhost:5173" });
  window.close();
});