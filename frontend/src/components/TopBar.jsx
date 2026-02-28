export default function TopBar({ healthOk, total }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
      <div>
        <div style={{ fontWeight:800 }}>Digital Brain</div>
        <div style={{ fontSize:12, opacity:.7 }}>Inbox · Iteración 1</div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <div style={{ padding:"8px 12px", borderRadius:999, border:"1px solid rgba(70,211,126,.22)", background:"rgba(20,30,24,.55)" }}>
          Items <b>{total}</b>
        </div>
        <div style={{ padding:"8px 12px", borderRadius:999, border:"1px solid rgba(70,211,126,.22)", background:"rgba(20,30,24,.55)" }}>
          {healthOk ? "🟢 API OK" : "🔴 API OFF"}
        </div>
      </div>
    </div>
  );
}