const API_BASE_URL = "https://remit-db.mintos.space";
const GEO_IP_URL = "https://get.geojs.io/v1/ip/geo.json";

const ACTIONS = {
  SAVE_MANUAL: "SAVE_MANUAL",
  SAVE_INBOX: "SAVE_INBOX",
  INIT_SCREENSHOT: "INIT_SCREENSHOT",
  START_CROP_UI: "START_CROP_UI",
  SHOW_TOAST: "SHOW_TOAST",
  GET_YOUTUBE_RECOMMENDATIONS: "GET_YOUTUBE_RECOMMENDATIONS",
};

const TOAST_TYPE = {
  SUCCESS: "success",
  ERROR: "error",
};

function getStorage(keys) {
  return chrome.storage.local.get(keys);
}

function setStorage(value) {
  return chrome.storage.local.set(value);
}

function removeStorage(keys) {
  return chrome.storage.local.remove(keys);
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0] ?? null;
}

async function sendToastToActiveTab(message, type) {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, {
    action: ACTIONS.SHOW_TOAST,
    message,
    type,
  });
}

async function fetchLocationFromIp() {
  try {
    const response = await fetch(GEO_IP_URL);
    if (!response.ok) return null;

    const data = await response.json();
    const lat = Number.parseFloat(data.latitude);
    const lon = Number.parseFloat(data.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch (error) {
    console.warn("Remit: could not get IP location", error);
    return null;
  }
}

async function urlToBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Remit: error converting URL to base64", error);
    return null;
  }
}

function inferItemTypeFromUrl(url) {
  const value = (url || "").toLowerCase();
  if (value.includes("youtube.com/watch") || value.includes("youtu.be/") || value.includes("/shorts/")) {
    return "YOUTUBE";
  }
  if (value.endsWith(".pdf")) {
    return "PDF";
  }
  if (value.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
    return "IMAGE";
  }
  return "WEB";
}

async function addLocationIfEnabled(payload) {
  const { use_location: useLocation } = await getStorage(["use_location"]);
  if (!useLocation) return payload;

  const geo = await fetchLocationFromIp();
  if (!geo) return payload;

  return {
    ...payload,
    location_lat: geo.lat,
    location_lon: geo.lon,
  };
}

async function sendToBackend(payload) {
  const { access_token: token } = await getStorage(["access_token"]);

  if (!token) {
    console.warn("Remit: save attempted without active session");
    await sendToastToActiveTab("Inicia sesion en Remit para guardar", TOAST_TYPE.ERROR);
    return { status: "unauthorized", message: "Inicia sesion en Remit para guardar" };
  }

  const payloadWithLocation = await addLocationIfEnabled(payload);

  try {
    const response = await fetch(`${API_BASE_URL}/inbox`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payloadWithLocation),
    });

    if (response.ok) {
      let data = null;
      try {
        data = await response.json();
      } catch (_error) {
        data = null;
      }

      await setStorage({ remit_last_saved: Date.now() });
      const saveCount = Number(data?.save_count || 1);
      const statusValue = String(data?.status || "").toUpperCase();
      const hasProcessingError = Boolean(data?.last_processing_error);
      const hasMergeSuggestion = Boolean(data?.metadata_json?.merge_suggestion);

      let toastMessage = "Guardado en Remit";
      if (saveCount > 1) {
        toastMessage = `Ya existia. Guardado x${saveCount}`;
      }
      if (statusValue === "PENDING" && hasProcessingError) {
        toastMessage = "Guardado en PENDING. Reproceso automatico en curso";
      } else if (statusValue === "PROCESSED") {
        toastMessage = `${toastMessage}. Clasificado automaticamente`;
      } else if (statusValue === "ORGANIZED") {
        toastMessage = `${toastMessage}. Organizado`;
      }
      if (hasMergeSuggestion) {
        toastMessage = `${toastMessage}. Merge sugerido disponible`;
      }

      await sendToastToActiveTab(toastMessage, TOAST_TYPE.SUCCESS);
      return { status: "ok", message: toastMessage, item: data };
    }

    if (response.status === 401) {
      await removeStorage(["access_token"]);
      await sendToastToActiveTab("Tu sesion ha caducado", TOAST_TYPE.ERROR);
      return { status: "unauthorized", message: "Tu sesion ha caducado" };
    }

    await sendToastToActiveTab("Error al guardar en el cerebro", TOAST_TYPE.ERROR);
    return { status: "error", message: "Error al guardar en el cerebro" };
  } catch (error) {
    console.error("Remit backend error", error);
    await sendToastToActiveTab("Error de conexion con el servidor", TOAST_TYPE.ERROR);
    return { status: "error", message: "Error de conexion con el servidor" };
  }
}

async function buildPayloadFromInboxUrl(request) {
  const payload = {
    source: "extension",
    url: request.url,
  };

  if (request.lat && request.lon) {
    payload.location_lat = request.lat;
    payload.location_lon = request.lon;
  }

  const inferredType = inferItemTypeFromUrl(request.url);

  if (request.isImageTab || inferredType === "IMAGE") {
    payload.item_type = "IMAGE";
    const base64 = await urlToBase64(request.url);
    if (base64) {
      payload.file_base64 = base64;
      delete payload.url;
    }
    return payload;
  }

  payload.item_type = inferredType;
  return payload;
}

async function handleInitScreenshot() {
  await new Promise((resolve) => setTimeout(resolve, 300));

  chrome.tabs.captureVisibleTab(null, { format: "png" }, async (dataUrl) => {
    if (chrome.runtime.lastError || !dataUrl) {
      console.error("Remit screenshot error:", chrome.runtime.lastError?.message || "capture failed");
      return;
    }

    const tab = await getActiveTab();
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, {
      action: ACTIONS.START_CROP_UI,
      image: dataUrl,
    });
  });
}

async function getYoutubeRecommendations(payload) {
  const { access_token: token } = await getStorage(["access_token"]);
  if (!token) {
    return { status: "unauthorized", recommendations: [] };
  }

  const params = new URLSearchParams();
  if (payload?.currentUrl) params.set("current_url", payload.currentUrl);
  if (payload?.currentTitle) params.set("current_title", payload.currentTitle);
  if (payload?.currentChannel) params.set("current_channel", payload.currentChannel);
  params.set("limit", String(Math.min(20, Math.max(1, Number(payload?.limit || 20)))));

  try {
    const response = await fetch(`${API_BASE_URL}/inbox/recommendations/youtube?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      await removeStorage(["access_token"]);
      return { status: "unauthorized", recommendations: [] };
    }
    if (!response.ok) {
      return { status: "error", recommendations: [] };
    }

    const data = await response.json();
    return { status: "ok", recommendations: Array.isArray(data) ? data : [] };
  } catch (_error) {
    return { status: "error", recommendations: [] };
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  (async () => {
    if (request.action === ACTIONS.SAVE_MANUAL) {
      const result = await sendToBackend(request.payload);
      sendResponse(result || { status: "error", message: "Error inesperado" });
      return;
    }

    if (request.action === ACTIONS.SAVE_INBOX) {
      const payload = await buildPayloadFromInboxUrl(request);
      const result = await sendToBackend(payload);
      sendResponse(result || { status: "error", message: "Error inesperado" });
      return;
    }

    if (request.action === ACTIONS.INIT_SCREENSHOT) {
      await handleInitScreenshot();
      sendResponse({ status: "ok" });
      return;
    }

    if (request.action === ACTIONS.GET_YOUTUBE_RECOMMENDATIONS) {
      const result = await getYoutubeRecommendations(request.payload);
      sendResponse(result);
      return;
    }

    sendResponse({ status: "ignored" });
  })();

  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "remit-save-text",
    title: "Guardar texto en Remit",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "remit-save-link",
    title: "Guardar enlace en Remit",
    contexts: ["link"],
  });
  chrome.contextMenus.create({
    id: "remit-save-image",
    title: "Guardar imagen en Remit",
    contexts: ["image"],
  });
  chrome.contextMenus.create({
    id: "remit-save-page",
    title: "Guardar esta pagina en Remit",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  const basePayload = { source: "extension" };

  if (info.menuItemId === "remit-save-text") {
    await sendToBackend({
      ...basePayload,
      item_type: "TEXT",
      content: info.selectionText,
    });
    return;
  }

  if (info.menuItemId === "remit-save-link") {
    const type = inferItemTypeFromUrl(info.linkUrl);
    await sendToBackend({
      ...basePayload,
      item_type: type === "IMAGE" ? "WEB" : type,
      url: info.linkUrl,
    });
    return;
  }

  if (info.menuItemId === "remit-save-page") {
    const type = inferItemTypeFromUrl(info.pageUrl);
    if (type === "IMAGE") {
      const base64 = await urlToBase64(info.pageUrl);
      if (base64) {
        await sendToBackend({ ...basePayload, item_type: "IMAGE", file_base64: base64 });
        return;
      }
    }

    await sendToBackend({
      ...basePayload,
      item_type: type,
      url: info.pageUrl,
    });
    return;
  }

  if (info.menuItemId === "remit-save-image") {
    const base64 = await urlToBase64(info.srcUrl);
    if (base64) {
      await sendToBackend({ ...basePayload, item_type: "IMAGE", file_base64: base64 });
      return;
    }

    await sendToBackend({ ...basePayload, item_type: "IMAGE", url: info.srcUrl });
  }
});

console.log("Remit background service worker ready");
