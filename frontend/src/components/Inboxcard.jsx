import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Video, FileText, Globe, ImageIcon, FileJson } from "lucide-react";

export default function InboxCard({ item, onOpen }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // 1. REINTEGRACIÓN DE DND-KIT (Obligatorio para que funcione)
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
  } = useSortable({ id: item.id });

  const style = {
    ...cardStyle,
    transform: CSS.Transform.toString(transform) || (isHovered ? "scale(1.02)" : "scale(1)"),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "pointer",
    boxShadow: isHovered && !isDragging ? "0 12px 24px rgba(0,0,0,0.4)" : "none",
    zIndex: isDragging ? 999 : isHovered ? 10 : 1,
  };

  const renderMedia = () => {
    // 2. LÓGICA PARA YOUTUBE
    if (item.item_type === "YOUTUBE" && item.url) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = item.url.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;

      if (videoId) {
        return (
          <div style={videoContainerStyle}>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
              title={item.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        );
      }
    }

    // 3. IMAGEN (Usando preview_base64 que es el campo real)
    if (item.preview_base64) {
      const src = item.preview_base64.startsWith("data:") 
        ? item.preview_base64 
        : `data:image/jpeg;base64,${item.preview_base64}`;
      return <img src={src} alt={item.title} style={imageStyle} />;
    }

    // FALLBACK: Si no hay media, mostrar icono según el tipo
    return (
      <div style={iconFallbackStyle}>
        {item.item_type === "TEXT" && <FileText size={40} opacity={0.4} />}
        {item.item_type === "WEB" && <Globe size={40} opacity={0.4} />}
        {item.item_type === "PDF" && <FileJson size={40} opacity={0.4} />}
        {(!item.item_type || item.item_type === "IMAGE") && <ImageIcon size={40} opacity={0.4} />}
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onOpen(item.id)} //
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderMedia()}
      
      <div style={infoPadding}>
        <div style={sourceTagStyle}>{item.source || "inbox"}</div>
        <h4 style={titleStyle}>{item.title || `Nota #${item.id}`}</h4>
        {item.location_city && (
          <span style={tagStyle}>{item.location_city}</span>
        )}
      </div>
    </div>
  );
}

// --- ESTILOS OPTIMIZADOS ---
const cardStyle = {
  breakInside: "avoid",
  marginBottom: "24px",
  borderRadius: "20px",
  background: "var(--card-bg)",
  border: "1px solid rgba(70, 211, 126, 0.2)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  width: "100%",
};

const videoContainerStyle = {
  width: "100%",
  aspectRatio: "16/9",
  background: "#000",
};

const imageStyle = {
  width: "100%",
  height: "auto",
  display: "block",
};

const iconFallbackStyle = {
  width: "100%",
  height: "140px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,0.02)",
  color: "var(--neon)",
};

const infoPadding = {
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const sourceTagStyle = {
  fontSize: "0.65rem",
  fontWeight: "800",
  color: "var(--neon)",
  textTransform: "uppercase",
  opacity: 0.5,
};

const titleStyle = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: "700",
  color: "white",
  lineHeight: "1.4",
};

const tagStyle = {
  fontSize: "0.7rem",
  background: "rgba(70, 211, 126, 0.1)",
  color: "var(--neon)",
  padding: "4px 10px",
  borderRadius: "8px",
  alignSelf: "flex-start",
  border: "1px solid rgba(70, 211, 126, 0.2)",
};