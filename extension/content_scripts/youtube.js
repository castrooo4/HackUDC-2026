// 1. Lógica para las miniaturas
function injectRemitButton(linkElement) {
  const parent = linkElement.parentElement;
  if (!parent) return;
  if (parent.querySelector('.remit-save-btn')) return;

  parent.classList.add('remit-hover-zone');

  const btn = document.createElement('button');
  btn.className = 'remit-save-btn';
  btn.innerHTML = '🧠';
  btn.title = 'Guardar en Remit';

  btn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const videoUrl = linkElement.href;
    chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: videoUrl });

    btn.innerHTML = '✅';
    setTimeout(() => { btn.innerHTML = '🧠'; }, 2000);
  });
  parent.appendChild(btn);
}

// 2. Lógica para el reproductor normal
function injectPlayerButton() {
  if (!window.location.href.includes('/watch?v=')) return;

  const titleContainer = document.querySelector('h1.ytd-watch-metadata');
  if (!titleContainer) return;
  if (titleContainer.querySelector('.remit-player-btn')) return;

  const btn = document.createElement('button');
  btn.className = 'remit-player-btn';
  btn.innerHTML = '🧠 Guardar vídeo';
  btn.title = 'Guardar en tu Inbox de Remit';

  btn.addEventListener('click', (event) => {
    event.preventDefault();
    const currentVideoUrl = window.location.href;
    chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: currentVideoUrl });

    btn.innerHTML = '✅ Guardado';
    setTimeout(() => { btn.innerHTML = '🧠 Guardar vídeo'; }, 2000);
  });

  titleContainer.style.display = 'flex';
  titleContainer.style.alignItems = 'center';
  titleContainer.appendChild(btn);
}

function injectShortsButton() {
  if (!window.location.href.includes('/shorts/')) return;

  // Buscamos el panel de acciones lateral de los Shorts (donde están el Like, Dislike, etc.)
  const actionPanels = document.querySelectorAll('#actions.ytd-reel-player-overlay-renderer');

  actionPanels.forEach(panel => {
    // Si este panel ya tiene nuestro botón, saltamos
    if (panel.querySelector('.remit-shorts-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'remit-shorts-btn';
    btn.innerHTML = '🧠';
    btn.title = 'Guardar en Remit';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const currentUrl = window.location.href;
      chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: currentUrl });

      btn.innerHTML = '✅';
      setTimeout(() => { btn.innerHTML = '🧠'; }, 2000);
    });

    // Lo insertamos al principio del panel de acciones
    panel.insertBefore(btn, panel.firstChild);
  });
}

// 4. El radar general
function scanYouTube() {
  const allLinks = document.querySelectorAll('a');
  allLinks.forEach((link) => {
    if (link.href && link.href.includes('/watch?v=')) {
      const hasImageInside = link.querySelector('img');
      if (hasImageInside || link.id === 'thumbnail') {
        injectRemitButton(link);
      }
    }
  });

  injectPlayerButton();
  injectShortsButton(); // Ejecutamos la búsqueda del Short activo
}

setTimeout(scanYouTube, 2000);
setInterval(scanYouTube, 1500);

console.log("Remit: Content Script cargado en YouTube (Miniaturas + Reproductor + Shorts).");