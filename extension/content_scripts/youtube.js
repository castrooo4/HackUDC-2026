function injectRemitButton(linkElement) {
  const parent = linkElement.parentElement;
  if (!parent || parent.querySelector(".remit-save-btn")) return;

  parent.classList.add("remit-hover-zone");

  const btn = document.createElement("button");
  btn.className = "remit-save-btn";
  btn.innerHTML = "🧠";
  btn.title = "Guardar en Remit";

  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: linkElement.href });

    btn.innerHTML = "✅";
    setTimeout(() => {
      btn.innerHTML = "🧠";
    }, 2000);
  });

  parent.appendChild(btn);
}

function injectPlayerButton() {
  if (!window.location.href.includes("/watch?v=")) return;

  const titleContainer = document.querySelector("h1.ytd-watch-metadata");
  if (!titleContainer || titleContainer.querySelector(".remit-player-btn")) return;

  const btn = document.createElement("button");
  btn.className = "remit-player-btn";
  btn.innerHTML = "🧠 Guardar video";
  btn.title = "Guardar en tu Inbox de Remit";

  btn.addEventListener("click", (event) => {
    event.preventDefault();
    chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: window.location.href });

    btn.innerHTML = "✅ Guardado";
    setTimeout(() => {
      btn.innerHTML = "🧠 Guardar video";
    }, 2000);
  });

  titleContainer.style.display = "flex";
  titleContainer.style.alignItems = "center";
  titleContainer.appendChild(btn);
}

function injectShortsButton() {
  if (!window.location.href.includes("/shorts/")) return;

  const actionPanels = document.querySelectorAll("#actions.ytd-reel-player-overlay-renderer");

  actionPanels.forEach((panel) => {
    if (panel.querySelector(".remit-shorts-btn")) return;

    const btn = document.createElement("button");
    btn.className = "remit-shorts-btn";
    btn.innerHTML = "🧠";
    btn.title = "Guardar en Remit";

    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      chrome.runtime.sendMessage({ action: "SAVE_INBOX", url: window.location.href });

      btn.innerHTML = "✅";
      setTimeout(() => {
        btn.innerHTML = "🧠";
      }, 2000);
    });

    panel.insertBefore(btn, panel.firstChild);
  });
}

function scanYouTube() {
  const allLinks = document.querySelectorAll("a");
  allLinks.forEach((link) => {
    if (link.href && link.href.includes("/watch?v=")) {
      const hasImageInside = link.querySelector("img");
      if (hasImageInside || link.id === "thumbnail") {
        injectRemitButton(link);
      }
    }
  });

  injectPlayerButton();
  injectShortsButton();
}

setTimeout(scanYouTube, 2000);
setInterval(scanYouTube, 1500);
