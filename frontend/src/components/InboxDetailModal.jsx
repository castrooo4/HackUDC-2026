// src/components/InboxDetailModal.jsx
import React from "react";

export default function InboxDetailModal({ open, item, loading, error, onClose }) {
  if (!open) return null;

  // Función para formatear la fecha
  const formatDate = (dateString) => {
    if (!dateString) return "Desconocida";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Función para obtener un emoji/color según el tipo
  const getTypeConfig = (type) => {
    const types = {
      YOUTUBE: { icon: "🎥", color: "#ff4444", label: "YouTube" },
      WEB: { icon: "🌐", color: "#2196F3", label: "Página Web" },
      IMAGE: { icon: "🖼️", color: "#9C27B0", label: "Imagen" },
      PDF: { icon: "📄", color: "#FF9800", label: "Documento PDF" },
      TEXT: { icon: "📝", color: "#4CAF50", label: "Nota de Texto" }
    };
    return types[type] || { icon: "🧠", color: "#46d37e", label: type };
  };

  const typeConfig = item ? getTypeConfig(item.item_type) : null;

  return (
    <div onMouseDown={onClose} style={backdropStyle}>
      <div onMouseDown={(e) => e.stopPropagation()} style={modalStyle}>

        {/* CABECERA */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
          <b style={{ color: "var(--neon)", fontSize: "1.2rem" }}>Detalle del Elemento</b>
          <button onClick={onClose} style={iconBtn}>✕</button>
        </div>

        {/* CONTENIDO (Cargando / Error / Detalle) */}
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", opacity: 0.7 }}>Accediendo a la memoria...</div>
        ) : error ? (
          <div style={{ color: "#ffb3b3", padding: "20px", background: "rgba(255,0,0,0.1)", borderRadius: "12px" }}>{error}</div>
        ) : item ? (
          <div style={contentContainerStyle}>

            {/* 1. IMAGEN GRANDE (Si la tiene) */}
            {item.preview_base64 && (
              <img
                src={item.preview_base64.startsWith('data:') ? item.preview_base64 : `data:image/jpeg;base64,${item.preview_base64}`}
                alt="Preview"
                style={largeImageStyle}
              />
            )}

            {/* 2. TÍTULO Y BADGES */}
            <h2 style={titleStyle}>{item.title || "Elemento sin título"}</h2>

            <div style={badgesContainerStyle}>
              <span style={{ ...badgeStyle, border: `1px solid ${typeConfig.color}`, color: typeConfig.color }}>
                {typeConfig.icon} {typeConfig.label}
              </span>
              <span style={badgeStyle}>⏱️ {formatDate(item.created_at)}</span>
              <span style={badgeStyle}>📥 {item.source}</span>
            </div>

            {/* 3. BOTÓN PARA IR A LA URL (Si existe) */}
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" style={urlButtonStyle}>
                🔗 VISITAR ENLACE ORIGINAL
              </a>
            )}

            {/* 4. CONTENIDO DE TEXTO */}
            {item.content && (
              <div style={{ marginTop: "20px" }}>
                <div style={{ opacity: 0.7, fontSize: 12, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Contenido
                </div>
                <pre style={preStyle}>{item.content}</pre>
              </div>
            )}

          </div>
        ) : null}
      </div>
    </div>
  );
}

// --- ESTILOS ---
const backdropStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
  backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
  justifyContent: "center", padding: 20, zIndex: 100000
};

const modalStyle = {
  width: "min(700px, 100%)", maxHeight: "90vh", borderRadius: 26,
  border: "2px solid rgba(70,211,126,.45)", background: "rgba(10,16,12,.95)",
  padding: 24, display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
};

const contentContainerStyle = {
  overflowY: "auto",
  paddingRight: "10px",
  // Personalizar el scrollbar
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(70, 211, 126, 0.5) transparent"
};

const iconBtn = {
  borderRadius: "50%", border: "1px solid rgba(70,211,126,.25)",
  background: "rgba(18,26,20,.35)", color: "white", width: "32px", height: "32px",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s"
};

const largeImageStyle = {
  width: "100%",
  maxHeight: "300px",
  objectFit: "cover",
  borderRadius: "16px",
  marginBottom: "20px",
  border: "1px solid rgba(255,255,255,0.1)"
};

const titleStyle = {
  margin: "0 0 15px 0",
  fontSize: "1.8rem",
  color: "white",
  lineHeight: "1.3"
};

const badgesContainerStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "20px"
};

const badgeStyle = {
  padding: "6px 12px",
  borderRadius: "20px",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  fontSize: "0.85rem",
  color: "rgba(255, 255, 255, 0.8)",
  display: "flex",
  alignItems: "center",
  gap: "5px"
};

const urlButtonStyle = {
  display: "block",
  width: "100%",
  padding: "15px",
  background: "rgba(70, 211, 126, 0.1)",
  border: "1px solid var(--neon)",
  borderRadius: "12px",
  color: "var(--neon)",
  textAlign: "center",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "1rem",
  letterSpacing: "1px",
  transition: "all 0.2s",
  cursor: "pointer"
};

const preStyle = {
  borderRadius: 16, border: "1px solid rgba(70,211,126,.18)",
  background: "rgba(0,0,0,.4)", padding: 18, whiteSpace: "pre-wrap",
  fontFamily: "inherit", fontSize: "1rem", lineHeight: "1.6", color: "rgba(255,255,255,0.9)", margin: 0
};