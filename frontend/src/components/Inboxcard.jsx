import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
// 1. Añade "Pin" aquí
import { FileJson, FileText, Globe, ImageIcon, X, Pin } from "lucide-react";

// 2. Asegúrate de recibir "onPin" en los props
export default function InboxCard({ item, onOpen, onDelete, onPin }) {
  const [isHovered, setIsHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

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
    // ... (el código de renderMedia que ya tenías) ...
    if (item.item_type === "YOUTUBE" && item.url) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = item.url.match(regExp);
      const videoId = match && match[2]?.length === 11 ? match[2] : null;

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
            />
          </div>
        );
      }
    }

    if (item.preview_base64) {
      const src = item.preview_base64.startsWith("data:")
        ? item.preview_base64
        : `data:image/jpeg;base64,${item.preview_base64}`;
      return <img src={src} alt={item.title} style={imageStyle} />;
    }

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
      onClick={() => {
        if (!isDragging) onOpen(item.id);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Botón de Eliminar */}
      {onDelete ? (
        <button
          type="button"
          style={{
            ...deleteBtnStyle,
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "translateY(0)" : "translateY(-4px)",
            pointerEvents: isHovered ? "auto" : "none",
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(item.id);
          }}
        >
          <X size={14} />
        </button>
      ) : null}

      {/* 3. BOTÓN DE LA CHINCHETA (Añade esto aquí) */}
      {onPin ? (
        <button
          type="button"
          style={{
            ...pinBtnStyle,
            opacity: item.is_pinned || isHovered ? 1 : 0,
            transform: item.is_pinned || isHovered ? "translateY(0)" : "translateY(-4px)",
            pointerEvents: item.is_pinned || isHovered ? "auto" : "none",
            color: item.is_pinned ? "var(--neon)" : "white",
            background: item.is_pinned ? "rgba(70, 211, 126, 0.2)" : "rgba(11, 15, 13, 0.78)",
            borderColor: item.is_pinned ? "var(--neon)" : "rgba(255, 255, 255, 0.2)",
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onPin(item);
          }}
        >
          <Pin size={14} fill={item.is_pinned ? "currentColor" : "none"} />
        </button>
      ) : null}

      {renderMedia()}

      <div style={infoPadding}>
        <div style={sourceTagStyle}>{item.source || "inbox"}</div>
        <h4 style={titleStyle}>{item.title || `Nota #${item.id}`}</h4>
        {(item.save_count || 1) > 1 ? <span style={tagStyle}>Guardado x{item.save_count}</span> : null}
        {item.last_processing_error ? <span style={warnTagStyle}>Pendiente de reproceso</span> : null}
        {item.location_city ? <span style={tagStyle}>{item.location_city}</span> : null}
      </div>
    </div>
  );
}

// 4. Añade este estilo al final del archivo
const pinBtnStyle = {
  position: "absolute",
  top: "12px",
  left: "12px",
  width: "26px",
  height: "26px",
  borderRadius: "999px",
  border: "1px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  zIndex: 20,
  transition: "all 0.2s ease",
};

// ... (el resto de estilos que ya tenías) ...
const cardStyle = {
  position: "relative",
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

const deleteBtnStyle = {
  position: "absolute",
  top: "12px",
  right: "12px",
  width: "26px",
  height: "26px",
  borderRadius: "999px",
  border: "1px solid rgba(255, 160, 160, 0.35)",
  background: "rgba(11, 15, 13, 0.78)",
  color: "#f3c7c7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  zIndex: 20,
  transition: "opacity 0.2s ease, transform 0.2s ease, background 0.2s ease",
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


const warnTagStyle = {
  fontSize: "0.7rem",
  background: "rgba(255, 170, 90, 0.12)",
  color: "#ffd6a8",
  padding: "4px 10px",
  borderRadius: "8px",
  alignSelf: "flex-start",
  border: "1px solid rgba(255, 170, 90, 0.3)",
};
