import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

export default function InboxCard({ item, onOpen }) {
  const [isHovered, setIsHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    ...cardStyle,
    width: "100%",
    height: "auto",
    minHeight: "120px",
    transform: CSS.Transform.toString(transform) || (isHovered ? "scale(1.02)" : "scale(1)"),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    boxShadow: isHovered && !isDragging ? "0 0 25px rgba(70, 211, 126, 0.4)" : "none",
    zIndex: isDragging ? 999 : isHovered ? 10 : 1,
  };

  return (
    <button
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
      <div style={containerStyle}>
        {item.preview_base64 && (
          <img
            src={item.preview_base64.startsWith("data:") ? item.preview_base64 : `data:image/jpeg;base64,${item.preview_base64}`}
            style={previewStyle}
            alt={`Preview de ${item.title || item.id}`}
          />
        )}

        <div style={titleStyle}>{item.title || `Nota #${item.id}`}</div>

        {item.item_type === "TEXT" && !item.preview_base64 && <div style={contentStyle}>{item.content}</div>}

        <div style={sourceStyle}>
          {item.source || "inbox"} - {item.item_type}
        </div>
      </div>
    </button>
  );
}

const previewStyle = {
  width: "100%",
  height: "auto",
  borderRadius: "16px",
  marginBottom: "15px",
  objectFit: "cover",
  border: "1px solid rgba(70, 211, 126, 0.1)",
};

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  textAlign: "center",
  alignItems: "center",
};

const cardStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  borderRadius: "40px",
  border: "3px solid #46d37e",
  background: "rgba(20, 25, 22, 0.7)",
  padding: "26px",
  transition: "all 0.3s ease",
  outline: "none",
  overflow: "hidden",
};

const contentStyle = {
  color: "rgba(215, 239, 224, 0.8)",
  fontSize: "1rem",
  lineHeight: "1.5",
  textAlign: "center",
  wordBreak: "break-word",
  marginTop: "8px",
};

const titleStyle = {
  color: "#46d37e",
  fontSize: "1.2rem",
  fontWeight: "bold",
  textTransform: "uppercase",
};

const sourceStyle = {
  fontSize: "0.75rem",
  color: "#46d37e",
  opacity: 0.5,
  marginTop: "10px",
  fontWeight: "800",
};
