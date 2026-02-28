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

// --- BOTONES DE GUARDADO ---

// 1. Enviar Manual
document.getElementById('saveBtn').addEventListener('click', () => {
  const content = document.getElementById('content').value.trim();
  const status = document.getElementById('status');

  if (!content) {
    status.textContent = "⚠️ Escribe algo primero.";
    return;
  }

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

// 2. Guardar Pestaña Actual
document.getElementById('autoSaveBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: tabs[0].url });
      document.getElementById('status').textContent = "✅ Pestaña guardada";
      setTimeout(() => window.close(), 1000);
    }
  });
});

// 3. Recortar y Guardar
document.getElementById('screenshotBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: "INIT_SCREENSHOT" });
  window.close();
});