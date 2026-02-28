import { LogOut } from "lucide-react";

export default function TopBar({ rightContent, onLogout }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div>
        <div style={{ fontWeight: 800, color: "var(--neon)" }}>RemIt</div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {rightContent}
        <button onClick={onLogout} style={logoutBtnStyle}>
          <LogOut size={14} style={{ marginRight: "6px" }} />
          SALIR
        </button>
      </div>
    </div>
  );
}

const logoutBtnStyle = {
  padding: "8px 16px",
  borderRadius: 999,
  border: "1px solid rgba(255, 90, 90, 0.3)",
  background: "rgba(255, 90, 90, 0.1)",
  color: "#ff6b6b",
  fontSize: "12px",
  fontWeight: "bold",
  cursor: "pointer",
  transition: "all 0.2s",
  display: "flex",
  alignItems: "center",
};
