// src/components/TopBar.jsx
export default function TopBar({ healthOk, total, rightContent }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
      <div>
        <div style={{ fontWeight:800, color: "var(--neon)" }}>Digital Brain</div>
        <div style={{ fontSize:12, opacity:.7, color: "var(--text)" }}>Inbox · Iteración 1</div>
      </div>
      <div style={{ display:"flex", gap:10, alignItems: "center" }}>
        {rightContent} {/* Aquí aparece el Slider */}
        <div style={badgeStyle}>Items <b>{total}</b></div>
        <div style={badgeStyle}>{healthOk ? "🟢 API OK" : "🔴 API OFF"}</div>
      </div>
    </div>
  );
}

const badgeStyle = {
  padding:"8px 12px", 
  borderRadius:999, 
  border:"1px solid rgba(70,211,126,.22)", 
  background:"rgba(20,30,24,.55)",
  color: "var(--text)",
  fontSize: "13px"
};