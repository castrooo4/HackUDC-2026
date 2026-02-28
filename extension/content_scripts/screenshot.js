console.log("Remit: Script de recorte cargado y listo.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Remit: Mensaje recibido en el script de la página:", request.action);
  if (request.action === "START_CROP_UI") {
    createCropOverlay(request.image);
  }
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_CROP_UI") {
    createCropOverlay(request.image);
  }
});

function createCropOverlay(screenshotUrl) {
  // Crear el contenedor oscuro
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.6); z-index: 2147483647; cursor: crosshair;
  `;

  // Crear el cuadro de selección
  const selector = document.createElement('div');
  selector.style.cssText = `
    border: 2px dashed #4CAF50; position: absolute; background: rgba(255,255,255,0.1);
  `;

  let startX, startY;

  const onMouseDown = (e) => {
    startX = e.clientX;
    startY = e.clientY;
    selector.style.left = startX + 'px';
    selector.style.top = startY + 'px';
    overlay.appendChild(selector);
    overlay.addEventListener('mousemove', onMouseMove);
  };

  const onMouseMove = (e) => {
    const width = e.clientX - startX;
    const height = e.clientY - startY;
    selector.style.width = Math.abs(width) + 'px';
    selector.style.height = Math.abs(height) + 'px';
    selector.style.left = (width > 0 ? startX : e.clientX) + 'px';
    selector.style.top = (height > 0 ? startY : e.clientY) + 'px';
  };

  const onMouseUp = (e) => {
    overlay.removeEventListener('mousemove', onMouseMove);
    overlay.removeEventListener('mousedown', onMouseDown);

    // Obtener coordenadas finales
    const rect = selector.getBoundingClientRect();
    overlay.remove();

    // Si el cuadro es muy pequeño, cancelamos
    if (rect.width < 10 || rect.height < 10) return;

    cropImage(screenshotUrl, rect);
  };

  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mouseup', onMouseUp);
  document.body.appendChild(overlay);
}

function cropImage(url, rect) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      img,
      rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr,
      0, 0, canvas.width, canvas.height
    );

    const croppedBase64 = canvas.toDataURL('image/png');

    // Enviamos el resultado al backend (Caso 4)
    chrome.runtime.sendMessage({
      action: "SAVE_MANUAL",
      payload: {
        source: "extension",
        item_type: "IMAGE",
        file_base64: croppedBase64
      }
    });
  };
  img.src = url;
}