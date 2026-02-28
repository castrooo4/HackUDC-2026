const REMIT_RECO_PANEL_ID = "remit-youtube-reco-panel";
let lastRequestedVideoId = null;
let isRequestInFlight = false;

function extractVideoId(url) {
  if (!url) return null;
  const patterns = [/(?:v=|\/shorts\/|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{11})/];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function getCurrentVideoContext() {
  const currentUrl = window.location.href;
  const currentTitle =
    document.querySelector("ytd-watch-metadata h1 yt-formatted-string")?.textContent?.trim() ||
    document.querySelector("meta[name='title']")?.getAttribute("content") ||
    "";
  const currentChannel =
    document.querySelector("ytd-channel-name #text a")?.textContent?.trim() ||
    document.querySelector("ytd-channel-name #text")?.textContent?.trim() ||
    "";

  return { currentUrl, currentTitle, currentChannel };
}

function createRecoItemElement(recommendation) {
  const item = recommendation?.item;
  if (!item?.url) return null;

  const row = document.createElement("a");
  row.className = "remit-reco-link";
  row.href = item.url;
  row.target = "_blank";
  row.rel = "noopener noreferrer";
  row.style.cssText = [
    "display:flex",
    "gap:10px",
    "padding:8px",
    "border-radius:10px",
    "text-decoration:none",
    "color:#f1f7f3",
    "background:rgba(255,255,255,0.02)",
    "border:1px solid rgba(70,211,126,0.12)",
    "transition:background .15s ease",
  ].join(";");

  row.onmouseenter = () => {
    row.style.background = "rgba(70,211,126,0.08)";
  };
  row.onmouseleave = () => {
    row.style.background = "rgba(255,255,255,0.02)";
  };

  const thumb = document.createElement("img");
  const metadataThumb = item.metadata_json?.thumbnail_url || "";
  const normalizedPreview =
    item.preview_base64 && item.preview_base64.startsWith("data:")
      ? item.preview_base64
      : (item.preview_base64 ? `data:image/jpeg;base64,${item.preview_base64}` : "");
  thumb.src = normalizedPreview || metadataThumb || "";
  thumb.alt = item.title || "Remit video";
  thumb.style.cssText = [
    "width:128px",
    "height:72px",
    "border-radius:8px",
    "object-fit:cover",
    "background:#0f1511",
    "flex-shrink:0",
  ].join(";");
  thumb.onerror = () => {
    thumb.style.display = "none";
  };

  const text = document.createElement("div");
  text.style.cssText = "display:flex;flex-direction:column;gap:4px;min-width:0";

  const title = document.createElement("div");
  title.textContent = item.title || "Video sin titulo";
  title.style.cssText = "font-size:12px;font-weight:700;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden";

  const channel = document.createElement("div");
  channel.textContent = item.metadata_json?.channel_name || "Remit";
  channel.style.cssText = "font-size:11px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";

  text.appendChild(title);
  text.appendChild(channel);

  if (thumb.src) {
    row.appendChild(thumb);
  }
  row.appendChild(text);
  return row;
}

function upsertRecommendationsPanel(recommendations) {
  const sidebar = document.querySelector("#secondary #secondary-inner") || document.querySelector("#secondary");
  if (!sidebar) return;

  let panel = document.getElementById(REMIT_RECO_PANEL_ID);
  if (!panel) {
    panel = document.createElement("section");
    panel.id = REMIT_RECO_PANEL_ID;
    panel.style.cssText = [
      "margin:0 0 14px 0",
      "padding:12px",
      "border-radius:14px",
      "border:1px solid rgba(70,211,126,.24)",
      "background:linear-gradient(180deg,rgba(13,20,16,.95),rgba(11,17,14,.9))",
      "color:#d7efe0",
    ].join(";");
    sidebar.prepend(panel);
  }

  panel.innerHTML = "";

  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px";
  header.innerHTML = '<div style="font-size:13px;font-weight:800;color:#46d37e;letter-spacing:.4px">Remit recomendaciones</div>';
  panel.appendChild(header);

  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "No hay recomendaciones guardadas todavía.";
    empty.style.cssText = "font-size:12px;opacity:.75;padding:6px 2px";
    panel.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.style.cssText = "display:flex;flex-direction:column;gap:8px;max-height:560px;overflow:auto;padding-right:2px";

  recommendations.forEach((recommendation) => {
    const row = createRecoItemElement(recommendation);
    if (row) list.appendChild(row);
  });

  panel.appendChild(list);
}

function fetchAndRenderRecommendations() {
  const videoId = extractVideoId(window.location.href);
  if (!videoId || isRequestInFlight || videoId === lastRequestedVideoId) return;

  isRequestInFlight = true;
  const payload = { ...getCurrentVideoContext(), limit: 20 };

  chrome.runtime.sendMessage(
    { action: "GET_YOUTUBE_RECOMMENDATIONS", payload },
    (response) => {
      isRequestInFlight = false;
      if (chrome.runtime.lastError) return;
      if (!response || response.status !== "ok") return;

      lastRequestedVideoId = videoId;
      upsertRecommendationsPanel(response.recommendations || []);
    }
  );
}

function injectRemitButton(linkElement) {
  if (linkElement.classList.contains("remit-reco-link")) return;
  if (linkElement.closest(`#${REMIT_RECO_PANEL_ID}`)) return;

  if (linkElement.querySelector(".remit-save-btn")) return;
  linkElement.classList.add("remit-hover-zone", "remit-thumb-anchor");

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

  linkElement.appendChild(btn);
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

function cleanupPanelInjectedSaveButtons() {
  const panel = document.getElementById(REMIT_RECO_PANEL_ID);
  if (!panel) return;
  panel.querySelectorAll(".remit-save-btn").forEach((btn) => btn.remove());
}

function scanYouTube() {
  cleanupPanelInjectedSaveButtons();

  const allLinks = document.querySelectorAll("a");
  allLinks.forEach((link) => {
    if (link.closest(`#${REMIT_RECO_PANEL_ID}`)) return;

    if (link.href && link.href.includes("/watch?v=")) {
      const hasImageInside = link.querySelector("img");
      if (hasImageInside || link.id === "thumbnail") {
        injectRemitButton(link);
      }
    }
  });

  injectPlayerButton();
  injectShortsButton();
  fetchAndRenderRecommendations();
}

setTimeout(scanYouTube, 2000);
setInterval(scanYouTube, 1500);
