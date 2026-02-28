import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import NewInboxItemForm from "./NewInboxItemForm";

const Motion = motion;

export default function AnimatedCreatePopup({ open, onClose, onCreate }) {
  const [formKey, setFormKey] = useState(0);

  const handleClose = () => {
    setFormKey((prev) => prev + 1);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={backdropStyle}
          />

          <Motion.div
            style={popupContainerStyle}
            initial={{ opacity: 0, scale: 0, y: 100, x: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50, x: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div style={headerStyle}>
              <b style={{ color: "#46d37e" }}>NUEVA NOTA</b>
              <button onClick={handleClose} style={closeBtnStyle}>x</button>
            </div>

            <NewInboxItemForm
              key={formKey}
              onCreate={async (payload) => {
                await onCreate(payload);
                handleClose();
              }}
            />
          </Motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const backdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 99998,
  background: "rgba(0,0,0,0.4)",
  backdropFilter: "blur(2px)",
};

const popupContainerStyle = {
  position: "fixed",
  bottom: "110px",
  right: "30px",
  width: "min(400px, 90vw)",
  background: "rgba(15, 20, 17, 0.98)",
  borderRadius: "30px",
  border: "2px solid rgba(70, 211, 126, 0.5)",
  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
  padding: "25px",
  zIndex: 99999,
  transformOrigin: "bottom right",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  letterSpacing: "1px",
  fontSize: "0.9rem",
};

const closeBtnStyle = {
  background: "none",
  border: "none",
  color: "rgba(215, 239, 224, 0.6)",
  cursor: "pointer",
  fontSize: "1.2rem",
  padding: "0 5px",
};
