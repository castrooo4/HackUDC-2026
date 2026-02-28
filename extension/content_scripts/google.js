// --- FUNCIÓN DE DEPURACIÓN ---
function remitLog(msg, count = "") {
  console.log(`%c[Remit Debug] ${msg}`, "color: #4CAF50; font-weight: bold;", count);
}

// 1. Botón para resultados de texto (Búsqueda normal)
function injectTextButton(title) {
  const container = title.closest('div.g') || title.closest('.tF2Cxc') || title.parentElement;
  if (!container || container.querySelector('.remit-save-btn')) return;

  const link = container.querySelector('a');
  if (!link) return;

  container.classList.add('remit-hover-zone');
  container.style.position = 'relative';

  const btn = document.createElement('button');
  btn.className = 'remit-save-btn';
  btn.innerHTML = '🧠';
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: link.href });
    btn.innerHTML = '✅';
    setTimeout(() => btn.innerHTML = '🧠', 2000);
  };
  container.appendChild(btn);
}

// 2. Botón para Google Imágenes (EL PLAN NUCLEAR)
function injectImageButton() {
  // Buscamos todas las imágenes que tengan un tamaño razonable (miniaturas)
  const allImages = document.querySelectorAll('img');
  let foundCount = 0;

  allImages.forEach(img => {
    // Solo nos interesan imágenes dentro de un enlace que sea un resultado de Google
    const link = img.closest('a');
    if (!link || !link.href.includes('imgres') && !link.href.includes('google.com/imgres')) return;

    // Buscamos el contenedor padre que envuelve la foto y el enlace
    const container = img.closest('div[role="listitem"]') || img.parentElement.parentElement;
    if (!container || container.querySelector('.remit-save-btn')) return;

    foundCount++;
    container.classList.add('remit-hover-zone');
    container.style.position = 'relative';
    container.style.display = 'block'; // Asegura que el botón se posicione bien

    const btn = document.createElement('button');
    btn.className = 'remit-save-btn';
    btn.innerHTML = '🧠';
    btn.style.zIndex = '9999';
    btn.style.top = '10px';
    btn.style.right = '10px';

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Limpiamos la URL de Google para sacar la web original
      let finalUrl = link.href;
      if (finalUrl.includes('imgrefurl=')) {
        const params = new URLSearchParams(new URL(finalUrl).search);
        finalUrl = params.get('imgrefurl');
      }

      chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: finalUrl });
      btn.innerHTML = '✅';
      setTimeout(() => btn.innerHTML = '🧠', 2000);
    };

    container.appendChild(btn);
  });

  if (foundCount > 0) remitLog("Botones inyectados en imágenes:", foundCount);
}

// 3. Radar de Google
function scanGoogle() {
  // Resultados de texto
  const textTitles = document.querySelectorAll('h3');
  textTitles.forEach(t => injectTextButton(t));

  // Resultados de imágenes
  injectImageButton();
}

// Ejecución
remitLog("Script de Google iniciado");
setInterval(scanGoogle, 2000);