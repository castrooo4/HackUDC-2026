import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

export default function InboxCard({ item, onOpen }) {
  const [isHovered, setIsHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  // LÓGICA DE DIMENSIONES REALES
  const contentLen = item.content?.length || 0;
  
  // Definimos anchos fijos aproximados para que no se estiren al infinito
  let width = "220px"; // Muy corto
  if (contentLen > 40) width = "280px";
  if (contentLen > 80) width = "350px";
  if (contentLen > 150) width = "450px";
  if (contentLen > 300) width = "550px";

  const style = {
    ...cardStyle,
    width: "100%",      // Se adapta al ancho de la columna del Masonry [cite: 9]
    height: "auto",     // La altura la dicta el contenido [cite: 9]
    minHeight: "120px", // Mínimo para notas muy breves [cite: 9]
    
    transform: CSS.Transform.toString(transform) || (isHovered ? "scale(1.02)" : "scale(1)"),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    boxShadow: isHovered && !isDragging ? "0 0 25px rgba(70, 211, 126, 0.4)" : "none",
    zIndex: isDragging ? 999 : (isHovered ? 10 : 1),
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { if (!isDragging) onOpen(item.id); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={containerStyle}>
        {/* NUEVO: Mostrar la previsualización si existe */}
        {item.preview_base64 && (
          <img 
            src={item.preview_base64.startsWith('data:') 
              ? item.preview_base64 
              : `data:image/jpeg;base64,${item.preview_base64}`} 
            style={previewStyle} 
            alt={`Preview de ${item.title || item.id}`}
          />
        )}

        <div style={titleStyle}>{item.title || `Nota #${item.id}`}</div>
        
        {/* Mostrar el contenido solo si es TEXT y no tiene previsualización */}
        {item.item_type === "TEXT" && !item.preview_base64 && (
          <div style={contentStyle}>{item.content}</div>
        )}
        
        <div style={sourceStyle}>
          {item.source || "inbox"} • {item.item_type}
        </div>
      </div>
    </button>
  );
}

// NUEVOS ESTILOS para la imagen
const previewStyle = {
  width: "100%",
  height: "auto",
  borderRadius: "16px",
  marginBottom: "15px",
  objectFit: "cover", // Asegura que la imagen llene el espacio estéticamente
  border: "1px solid rgba(70, 211, 126, 0.1)" // Un borde sutil neón
};

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  textAlign: "center",
  alignItems: "center"
};

const cardStyle = {
  // ... mantén tus estilos base de Masonry (width: 100%, height: auto, etc.)
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start", // Alinea el contenido arriba
  borderRadius: "40px",
  border: "3px solid #46d37e",
  background: "rgba(20, 25, 22, 0.7)",
  padding: "26px",
  transition: "all 0.3s ease",
  outline: "none",
  overflow: "hidden" 
};

// Asegúrate de que cardStyle no tenga un flex: "0 0 auto" que interfiera
/*
const cardStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "40px",
  border: "3px solid #46d37e",
  background: "rgba(20, 25, 22, 0.7)",
  padding: "26px",
  transition: "all 0.3s ease",
  outline: "none",
  overflow: "hidden" 
};*/

// Actualiza el contentStyle para que NO corte el texto
const contentStyle = {
  color: "rgba(215, 239, 224, 0.8)",
  fontSize: "1rem",
  lineHeight: "1.5",
  textAlign: "center",
  wordBreak: "break-word", // Evita que palabras largas rompan el diseño
  marginTop: "8px"
};

/*
const cardStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "40px",
  border: "3px solid #46d37e",
  background: "rgba(20, 25, 22, 0.7)",
  cursor: "pointer",
  padding: "30px", // Más padding para que respiren las notas grandes
  transition: "all 0.3s ease",
  outline: "none",
  overflow: "hidden" 
};*/

/*
const containerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  width: "100%",
  textAlign: "center"
};
*/

const titleStyle = {
  color: "#46d37e",
  fontSize: "1.2rem",
  fontWeight: "bold",
  textTransform: "uppercase"
};

const sourceStyle = {
  fontSize: "0.75rem",
  color: "#46d37e",
  opacity: 0.5,
  marginTop: "10px",
  fontWeight: "800"
};