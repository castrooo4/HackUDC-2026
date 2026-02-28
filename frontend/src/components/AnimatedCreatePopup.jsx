// src/components/AnimatedCreatePopup.jsx
import { motion, AnimatePresence } from "framer-motion";
import NewInboxItemForm from "./NewInboxItemForm";
import { useState } from "react";

export default function AnimatedCreatePopup({ open, onClose, onCreate }) {
  // Estado local para limpiar el formulario al cerrar
  const [formKey, setFormKey] = useState(0);

  const handleClose = () => {
    setFormKey(prev => prev + 1); // Fuerza un re-render del form para limpiarlo
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 1. Backdrop invisible para cerrar al hacer clic fuera */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={backdropStyle}
          />

          {/* 2. El Contenedor del Formulario Animado */}
          <motion.div
            // Punto de origen de la animación: Abajo a la derecha (donde está el botón)
            style={popupContainerStyle}
            initial={{ opacity: 0, scale: 0, y: 100, x: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50, x: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div style={headerStyle}>
              <b style={{ color: "#46d37e" }}>NUEVA NOTA</b>
              <button onClick={handleClose} style={closeBtnStyle}>✕</button>
            </div>
            
            <NewInboxItemForm 
              key={formKey}
              onCreate={async (payload) => {
                await onCreate(payload);
                handleClose();
              }} 
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const backdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 99998, // Justo debajo del popup
  background: "rgba(0,0,0,0.4)", // Un oscurecimiento sutil
  backdropFilter: "blur(2px)"
};

const popupContainerStyle = {
  position: "fixed",
  bottom: "110px", // Espacio para el botón + abajo
  right: "30px",
  width: "min(400px, 90vw)",
  background: "rgba(15, 20, 17, 0.98)",
  borderRadius: "30px",
  border: "2px solid rgba(70, 211, 126, 0.5)",
  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
  padding: "25px",
  zIndex: 99999,
  // IMPORTANTE: Define el punto desde donde escala la animación
  transformOrigin: "bottom right", 
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  letterSpacing: "1px",
  fontSize: "0.9rem"
};

const closeBtnStyle = {
  background: "none",
  border: "none",
  color: "rgba(215, 239, 224, 0.6)",
  cursor: "pointer",
  fontSize: "1.2rem",
  padding: "0 5px"
};