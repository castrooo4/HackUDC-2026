function injectRemitButton(linkElement) {
  const parent = linkElement.parentElement;
  if (!parent) return;

  // Actualizado al nuevo nombre: remit
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

    console.log("Remit: URL enviada ->", videoUrl);
  });

  parent.appendChild(btn);
}

function scanThumbnails() {
  const allLinks = document.querySelectorAll('a');

  allLinks.forEach((link) => {
    if (link.href && link.href.includes('/watch?v=')) {
      const hasImageInside = link.querySelector('img');
      if (hasImageInside || link.id === 'thumbnail') {
        injectRemitButton(link);
      }
    }
  });
}

setTimeout(scanThumbnails, 2000);
setInterval(scanThumbnails, 1500);

console.log("Remit: Content Script cargado en YouTube.");