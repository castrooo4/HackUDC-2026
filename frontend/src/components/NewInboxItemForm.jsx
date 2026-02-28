import { useState } from "react";

export default function NewInboxItemForm({ onCreate }) {
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("extension");
  const [content, setContent] = useState("");
  const [itemType, setItemType] = useState("TEXT");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);

    const payload = {
      title: title.trim() || undefined,
      source: source.trim() || "extension",
      item_type: itemType
      /*
      item_type: item_type,
      [item_type === "TEXT" ? "content" : "url"]: content.trim()
      */
    };

    // Mapeo de campos según el readme del backend 
    if (itemType === "TEXT") {
      payload.content = content.trim();
    } else if (itemType === "IMAGE" || itemType === "PDF") {
      // Si el contenido empieza por data: es un base64, si no es una URL 
      if (content.startsWith("data:")) {
        payload.file_base64 = content.trim();
      } else {
        payload.url = content.trim();
      }
    } else {
      // Para YOUTUBE y WEB se usa URL 
      payload.url = content.trim();
    }

  try {
    await onCreate(payload);
    setTitle("");
    setContent("");
  } catch (err) {
    console.error("Error creando item:", err);
    alert("Hubo un error al crear el item. Por favor intenta de nuevo.");
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
          placeholder="Título (opcional)" 
          style={{ ...inputStyle, flex: 1 }} 
        />
        <select 
          value={itemType} 
          onChange={(e) => setItemType(e.target.value)} 
          style={selectStyle}
        >
          <option value="TEXT">Texto</option>
          <option value="YOUTUBE">YouTube</option>
          <option value="IMAGE">Imagen</option>
          <option value="PDF">PDF</option>
          <option value="WEB">Web</option>
        </select>
      </div>

      <input 
        value={source} 
        onChange={(e) => setSource(e.target.value)} 
        placeholder='Fuente (ej: extension)' 
        style={inputStyle} 
      />

      <textarea 
        value={content} 
        onChange={(e) => setContent(e.target.value)} 
        placeholder={
          itemType === "TEXT" ? "Escribe tu nota..." : "Pega la URL o el base64..."
        } 
        rows={4} 
        style={textareaStyle} 
      />

      <button disabled={loading || !content.trim()} style={btnStyle}>
        {loading ? "Creando…" : "CREAR"}
      </button>
    </form>
    /*
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Título (opcional)" style={inputStyle} />
        <input value={source} onChange={(e)=>setSource(e.target.value)} placeholder='source (default "extension")' style={inputStyle} />
        <textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder="content (obligatorio)" rows={4} style={textareaStyle} />
        <button disabled={loading || !content.trim()} style={btnStyle}>
          {loading ? "Creando…" : "Crear"}
        </button>
    </form>
    */

    /*
    <form onSubmit={submit} style={{ marginBottom:18, padding:16, borderRadius:26, border:"1px solid rgba(70,211,126,.18)", background:"rgba(10,16,12,.35)" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr auto", gap:10, marginBottom:10 }}>
        <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Título (opcional)" style={inputStyle} />
        <input value={source} onChange={(e)=>setSource(e.target.value)} placeholder='source (default "extension")' style={inputStyle} />
        <button disabled={loading || !content.trim()} style={btnStyle}>
          {loading ? "Creando…" : "Crear"}
        </button>
      </div>
      <textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder="content (obligatorio)" rows={4} style={textareaStyle} />
    </form>
    */
  );
}

const inputStyle = {
  borderRadius: 16, 
  border: "1px solid rgba(70,211,126,.22)", 
  background: "rgba(12,18,14,.55)", 
  color: "white", 
  padding: "12px",
  outline: "none"
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
  background: "rgba(20,30,24,.85)"
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
  transition: "transform 0.2s"
};
