export default function InboxDetailModal({ open, item, loading, error, onClose }) {
  if (!open) return null;

  return (
    <div onMouseDown={onClose} style={backdropStyle}>
      <div onMouseDown={(e)=>e.stopPropagation()} style={modalStyle}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <b style={{ color:"rgba(70,211,126,.95)" }}>Detalle</b>
          <button onClick={onClose} style={iconBtn}>✕</button>
        </div>

        {loading ? <div style={{ opacity:.7 }}>Cargando…</div>
          : error ? <div style={{ color:"#ffb3b3" }}>{error}</div>
          : item ? (
            <>
              <div style={{ opacity:.7, fontSize:12, marginBottom:10 }}>
                #{item.id} · {item.status} · {item.created_at}
              </div>
              <div style={{ marginBottom:10 }}>
                <div style={{ opacity:.7, fontSize:12 }}>Título</div>
                <div style={{ fontWeight:700 }}>{item.title || "—"}</div>
              </div>
              <div>
                <div style={{ opacity:.7, fontSize:12 }}>Contenido</div>
                <pre style={preStyle}>{item.content}</pre>
              </div>
            </>
          ) : null}
      </div>
    </div>
  );
}

const backdropStyle = { position:"fixed", inset:0, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, zIndex:1000 };
const modalStyle = { width:"min(820px, 100%)", borderRadius:26, border:"2px solid rgba(70,211,126,.45)", background:"rgba(10,16,12,.65)", padding:16 };
const iconBtn = { borderRadius:14, border:"1px solid rgba(70,211,126,.25)", background:"rgba(18,26,20,.35)", color:"white", padding:"8px 10px", cursor:"pointer" };
const preStyle = { borderRadius:18, border:"1px solid rgba(70,211,126,.18)", background:"rgba(12,18,14,.55)", padding:12, whiteSpace:"pre-wrap", maxHeight:"46vh", overflow:"auto" };