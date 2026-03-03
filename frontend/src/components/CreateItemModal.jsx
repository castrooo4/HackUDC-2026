import NewInboxItemForm from "./NewInboxItemForm";

export default function CreateItemModal({ open, onClose, onCreate }) {
  if (!open) return null;

  return (
    <div onMouseDown={onClose} style={backdropStyle}>
      <div onMouseDown={(event) => event.stopPropagation()} style={modalStyle}>
        <div style={headerStyle}>
          <b style={{ color: "rgba(70,211,126,.95)" }}>Nueva Nota</b>
          <button onClick={onClose} style={closeBtnStyle}>X</button>
        </div>
        <NewInboxItemForm
          onCreate={async (payload) => {
            await onCreate(payload);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100000,
  backdropFilter: "blur(5px)",
};

const modalStyle = {
  width: "min(500px, 90%)",
  borderRadius: 26,
  border: "2px solid rgba(70,211,126,.45)",
  background: "rgba(10,16,12, 0.98)",
  padding: 24,
};

const headerStyle = { display: "flex", justifyContent: "space-between", marginBottom: 20 };
const closeBtnStyle = { background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 18 };
