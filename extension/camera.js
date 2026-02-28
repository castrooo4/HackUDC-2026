const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const snapBtn = document.getElementById('snapBtn');
const status = document.getElementById('status');

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    video.srcObject = stream;
  } catch (err) {
    status.textContent = "❌ Error al acceder a la cámara. Revisa los permisos.";
    console.error(err);
  }
}

snapBtn.addEventListener('click', () => {
  status.textContent = "⚙️ Procesando...";
  snapBtn.disabled = true;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const base64Image = canvas.toDataURL('image/png');

  chrome.runtime.sendMessage({
    action: "SAVE_MANUAL",
    payload: {
      source: "extension",
      item_type: "IMAGE",
      file_base64: base64Image
    }
  }, (response) => {
    status.textContent = "✅ ¡Foto guardada en tu cerebro digital!";

    const stream = video.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());

    setTimeout(() => { window.close(); }, 1500);
  });
});

startCamera();