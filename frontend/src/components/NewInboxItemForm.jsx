import { useState } from "react";

// 1. Añadimos la función para capturar el GPS
function obtenerUbicacion() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("El navegador no soporta geolocalización."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        resolve({
          lat: posicion.coords.latitude,
          lon: posicion.coords.longitude
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
}

export default function NewInboxItemForm({ onCreate }) {
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("web"); // Cambiado por defecto a 'web'
  const [content, setContent] = useState("");
  const [itemType, setItemType] = useState("TEXT");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!content.trim()) return;
    setLoading(true);

    const rawContent = content.trim();
    let detectedType = "TEXT";

    if (rawContent.startsWith("data:image/")) {
      detectedType = "IMAGE";
    } else if (rawContent.startsWith("data:application/pdf")) {
      detectedType = "PDF";
    } else if (rawContent.startsWith("http")) {
      const url = rawContent.toLowerCase();
      if (url.includes("youtube.com/") || url.includes("youtu.be/")) {
        detectedType = "YOUTUBE";
      } else if (url.match(/\.(jpeg|jpg|gif|png|webp)$/)) {
        detectedType = "IMAGE";
      } else if (url.endsWith(".pdf")) {
        detectedType = "PDF";
      } else {
        detectedType = "WEB";
      }
    }

    setItemType(detectedType);

    const payload = {
      title: title.trim() || undefined,
      source: source.trim() || "web",
      item_type: detectedType,
    };

    if (detectedType === "TEXT") {
      payload.content = rawContent;
    } else if (detectedType === "IMAGE" || detectedType === "PDF") {
      if (rawContent.startsWith("data:")) {
        payload.file_base64 = rawContent;
      } else {
        payload.url = rawContent;
      }
    } else {
      payload.url = rawContent;
    }

    // 2. Intentamos capturar la ubicación antes de enviar el payload
    try {
      const ubicacion = await obtenerUbicacion();
      payload.location_lat = ubicacion.lat;
      payload.location_lon = ubicacion.lon;
    } catch (error) {
      console.warn("No se pudo obtener la ubicación. Se enviará sin coordenadas.", error);
    }

    try {
      await onCreate(payload);
      setTitle("");
      setContent("");
      setItemType("TEXT");
    } catch (error) {
      console.error("Error creando item:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titulo (opcional)"
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>

      <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Fuente (ej: web)" style={inputStyle} />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={itemType === "TEXT" ? "Escribe tu nota..." : "Pega la URL o el base64..."}
        rows={4}
        style={textareaStyle}
      />

      <button disabled={loading || !content.trim()} style={btnStyle}>
        {loading ? "Creando..." : "CREAR"}
      </button>
    </form>
  );
}

const inputStyle = {
  borderRadius: 16,
  border: "1px solid rgba(70,211,126,.22)",
  background: "rgba(12,18,14,.55)",
  color: "white",
  padding: "12px",
  outline: "none",
};

const textareaStyle = { ...inputStyle, resize: "vertical" };

const btnStyle = {
  borderRadius: 16,
  border: "1px solid rgba(70,211,126,.35)",
  background: "#46d37e",
  color: "#0b0f0d",
  padding: "12px",
  fontWeight: "bold",
  cursor: "pointer",
  transition: "transform 0.2s",
};