chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "START_CROP_UI") {
    createCropOverlay(request.image);
  }
});

function createCropOverlay(screenshotUrl) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.6); z-index: 2147483647; cursor: crosshair;
  `;

  const selector = document.createElement("div");
  selector.style.cssText = `
    border: 2px dashed #4CAF50; position: absolute; background: rgba(255,255,255,0.1);
  `;

  let startX;
  let startY;

  const onMouseDown = (event) => {
    startX = event.clientX;
    startY = event.clientY;
    selector.style.left = `${startX}px`;
    selector.style.top = `${startY}px`;
    overlay.appendChild(selector);
    overlay.addEventListener("mousemove", onMouseMove);
  };

  const onMouseMove = (event) => {
    const width = event.clientX - startX;
    const height = event.clientY - startY;
    selector.style.width = `${Math.abs(width)}px`;
    selector.style.height = `${Math.abs(height)}px`;
    selector.style.left = `${width > 0 ? startX : event.clientX}px`;
    selector.style.top = `${height > 0 ? startY : event.clientY}px`;
  };

  const onMouseUp = () => {
    overlay.removeEventListener("mousemove", onMouseMove);
    overlay.removeEventListener("mousedown", onMouseDown);

    const rect = selector.getBoundingClientRect();
    overlay.remove();
    if (rect.width < 10 || rect.height < 10) return;

    cropImage(screenshotUrl, rect);
  };

  overlay.addEventListener("mousedown", onMouseDown);
  overlay.addEventListener("mouseup", onMouseUp);
  document.body.appendChild(overlay);
}

function cropImage(url, rect) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      img,
      rect.left * dpr,
      rect.top * dpr,
      rect.width * dpr,
      rect.height * dpr,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedBase64 = canvas.toDataURL("image/png");

    chrome.runtime.sendMessage({
      action: "SAVE_MANUAL",
      payload: {
        source: "extension",
        item_type: "IMAGE",
        file_base64: croppedBase64,
      },
    });
  };
  img.src = url;
}
