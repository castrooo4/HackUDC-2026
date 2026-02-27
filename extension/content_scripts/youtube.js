function injectKeleaButton(linkElement) {
  // Cogemos el contenedor que envuelve a la imagen del vídeo
  const parent = linkElement.parentElement;
  if (!parent) return;

  // Si ya tiene el botón, lo ignoramos
  if (parent.querySelector('.Remit-save-btn')) return;

  // ¡MAGIA!: Le ponemos nuestra propia clase al contenedor de YouTube 
  // para que nuestro CSS sepa cuándo hacer hover
  parent.classList.add('Remit-hover-zone');

  const btn = document.createElement('button');
  btn.className = 'Remit-save-btn';
  btn.innerHTML = '🧠';
  btn.title = 'Guardar en Remit';

  btn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const videoUrl = linkElement.href;
    chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: videoUrl });

    btn.innerHTML = '✅';
    setTimeout(() => { btn.innerHTML = '🧠'; }, 2000);

    console.log("Remit: URL enviada ->", videoUrl);
  });

  parent.appendChild(btn);
}

function scanThumbnails() {
  // Buscamos todos los enlaces de la página
  const allLinks = document.querySelectorAll('a');

  allLinks.forEach((link) => {
    // Filtro 1: Tiene que ser un enlace de vídeo de YouTube
    if (link.href && link.href.includes('/watch?v=')) {

      // Filtro 2: Tiene que tener una imagen dentro (es una miniatura, no un texto)
      const hasImageInside = link.querySelector('img');

      if (hasImageInside || link.id === 'thumbnail') {
        injectKeleaButton(link);
      }
    }
  });
}

// Escaneos periódicos (El radar)
setTimeout(scanThumbnails, 2000);
setInterval(scanThumbnails, 1500);

console.log("Remit: Content Script cargado. Escaneando miniaturas de YouTube...");