// src/components/TopBar.jsx
import { LogOut } from "lucide-react";

export default function TopBar({ healthOk, total, rightContent, onLogout }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
      <div>
        <div style={{ fontWeight:800, color: "var(--neon)" }}>RemIt</div>
        <div style={{ fontSize:12, opacity:.7, color: "var(--text)" }}>Gestor de Memoria · Versión Pro</div>
      </div>
      <div style={{ display:"flex", gap:10, alignItems: "center" }}>
        {rightContent}
        <div style={badgeStyle}>Items <b>{total}</b></div>
        <div style={badgeStyle}>{healthOk ? "🟢 API OK" : "🔴 API OFF"}</div>
        <button onClick={onLogout} style={logoutBtnStyle}>
          <LogOut size={14} style={{ marginRight: '6px' }} /> {/* Icono añadido */}
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
  display: "flex",       // Añadido para alinear icono y texto
  alignItems: "center"   // Añadido para centrar verticalmente
};

const badgeStyle = {
  padding:"8px 12px", 
  borderRadius:999, 
  border:"1px solid rgba(70,211,126,.22)", 
  background:"rgba(20,30,24,.55)",
  color: "var(--text)",
  fontSize: "13px"
};