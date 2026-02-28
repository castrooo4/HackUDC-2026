import { useState } from "react";

export default function NewInboxItemForm({ onCreate }) {
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("extension");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      await onCreate({ title: title.trim() || undefined, source: source.trim() || "extension", content });
      setTitle("");
      setContent("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Título (opcional)" style={inputStyle} />
        <input value={source} onChange={(e)=>setSource(e.target.value)} placeholder='source (default "extension")' style={inputStyle} />
        <textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder="content (obligatorio)" rows={4} style={textareaStyle} />
        <button disabled={loading || !content.trim()} style={btnStyle}>
          {loading ? "Creando…" : "Crear"}
        </button>
    </form>

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
  borderRadius:16, border:"1px solid rgba(70,211,126,.22)", background:"rgba(12,18,14,.55)", color:"white", padding:"12px"
};
const textareaStyle = { ...inputStyle, resize:"vertical" };
const btnStyle = {
  borderRadius:16, border:"1px solid rgba(70,211,126,.35)", background:"rgba(18,26,20,.45)", color:"white", padding:"10px 14px", cursor:"pointer"
};
