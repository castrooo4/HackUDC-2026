function injectRemitButtonGoogle(titleElement) {
  // 1. A partir del título (h3), buscamos el enlace que lo contiene
  const mainLink = titleElement.closest('a');
  if (!mainLink || !mainLink.href) return;

  // 2. Buscamos la caja contenedora (div.g suele ser la principal, pero aseguramos con un fallback)
  const resultContainer = titleElement.closest('div.g') || titleElement.closest('.tF2Cxc') || titleElement.parentElement.parentElement;
  if (!resultContainer) return;

  // 3. Si ya tiene el botón, lo ignoramos
  if (resultContainer.querySelector('.remit-save-btn')) return;

  // 4. Añadimos nuestra clase para el hover
  resultContainer.classList.add('remit-hover-zone');

  const btn = document.createElement('button');
  btn.className = 'remit-save-btn remit-google-btn';
  btn.innerHTML = '🧠';
  btn.title = 'Guardar en Remit';

  btn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const url = mainLink.href;
    chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: url });

    btn.innerHTML = '✅';
    setTimeout(() => { btn.innerHTML = '🧠'; }, 2000);

    console.log("Remit: URL enviada desde Google ->", url);
  });

  // Forzamos la posición y le quitamos el overflow por si Google lo está ocultando
  resultContainer.style.position = 'relative';
  resultContainer.style.overflow = 'visible';

  resultContainer.appendChild(btn);
}

function scanGoogleResults() {
  // Buscamos directamente los títulos de los resultados (siempre son h3 en Google)
  const titles = document.querySelectorAll('h3');

  titles.forEach((title) => {
    // A veces Google mete h3 ocultos o vacíos, los filtramos
    if (title.innerText.trim().length > 0) {
      injectRemitButtonGoogle(title);
    }
  });
}

// Radar para Google
setTimeout(scanGoogleResults, 1000);
setInterval(scanGoogleResults, 2000);

console.log("Remit: Content Script cargado en Google (Versión Acorazada).");