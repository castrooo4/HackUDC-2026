// src/components/InboxDetailModal.jsx
import React, { useState, useEffect } from "react";
import { deleteInboxItem, updateInboxItem, getDirectoriesTree } from "../api/inbox";

export default function InboxDetailModal({ open, item, loading, error, onClose }) {
  const [directories, setDirectories] = useState([]);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [newDirId, setNewDirId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Cargamos las carpetas al abrir el modal para poder mostrar el nombre real
  useEffect(() => {
    if (open) {
      setIsEditingCategory(false);
      getDirectoriesTree().then(res => {
        // Aplanamos el árbol
        const flattenFolders = (folders) => {
          let flat = [];
          for (const f of folders) {
            flat.push(f);
            if (f.children && f.children.length > 0 && typeof f.children[0] === 'object') {
              flat = flat.concat(flattenFolders(f.children));
            }
          }
          return flat;
        };
        setDirectories(flattenFolders(res?.roots || []));
      }).catch(err => console.error("Error al cargar carpetas en el modal:", err));
    }
  }, [open]);

  if (!open) return null;

  // --- FUNCIONES DE UTILIDAD ---
  const formatDate = (dateString) => {
    if (!dateString) return "Desconocida";
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getTypeConfig = (type) => {
    const types = {
      YOUTUBE: { icon: "🎥", color: "#ff4444", label: "YouTube" },
      WEB: { icon: "🌐", color: "#2196F3", label: "Web" },
      IMAGE: { icon: "🖼️", color: "#9C27B0", label: "Imagen" },
      PDF: { icon: "📄", color: "#FF9800", label: "PDF" },
      TEXT: { icon: "📝", color: "#4CAF50", label: "Texto" }
    };
    return types[type] || { icon: "🧠", color: "#46d37e", label: type };
  };

  const typeConfig = item ? getTypeConfig(item.item_type) : null;
  const currentCategoryName = item?.directory_id
    ? (directories.find(d => d.id === item.directory_id)?.name || `Carpeta ${item.directory_id}`)
    : "Sin clasificar (En Novedades)";

  // --- FUNCIONES DE ACCIÓN ---
  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta nota de tu cerebro digital?")) return;

    setActionLoading(true);
    try {
      await deleteInboxItem(item.id);
      window.postMessage({ type: "REMIT_NEW_ITEM" }, "*"); // Disparamos el walkie-talkie
      onClose();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleModifyCategoryClick = () => {
    if (!item.directory_id) {
      alert("❌ Este elemento aún no está organizado en ninguna carpeta. Ve a la pestaña de Novedades para clasificarlo primero.");
      return;
    }
    setNewDirId(item.directory_id);
    setIsEditingCategory(true);
  };

  const handleSaveCategory = async () => {
    setActionLoading(true);
    try {
      await updateInboxItem(item.id, { directory_id: parseInt(newDirId) });
      window.postMessage({ type: "REMIT_NEW_ITEM" }, "*"); // Disparamos el walkie-talkie
      setIsEditingCategory(false);
      onClose();
    } catch (err) {
      alert("Error al mover de carpeta: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div onMouseDown={onClose} style={backdropStyle}>
      <div onMouseDown={(e) => e.stopPropagation()} style={modalStyle}>

        {/* CABECERA */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
          <b style={{ color: "var(--neon)", fontSize: "1.2rem" }}>Detalle del Elemento</b>
          <button onClick={onClose} style={iconBtn}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", opacity: 0.7 }}>Accediendo a la memoria...</div>
        ) : error ? (
          <div style={{ color: "#ffb3b3", padding: "20px", background: "rgba(255,0,0,0.1)", borderRadius: "12px" }}>{error}</div>
        ) : item ? (
          <div style={contentContainerStyle}>

            {/* IMAGEN GRANDE */}
            {item.preview_base64 && (
              <img
                src={item.preview_base64.startsWith('data:') ? item.preview_base64 : `data:image/jpeg;base64,${item.preview_base64}`}
                alt="Preview" style={largeImageStyle}
              />
            )}

            <h2 style={titleStyle}>{item.title || "Elemento sin título"}</h2>

            {/* BADGES INFORMATIVOS */}
            <div style={badgesContainerStyle}>
              <span style={{ ...badgeStyle, border: `1px solid ${typeConfig.color}`, color: typeConfig.color }}>
                {typeConfig.icon} {typeConfig.label}
              </span>
              <span style={badgeStyle}>⏱️ {formatDate(item.created_at)}</span>
              <span style={{ ...badgeStyle, background: "rgba(70, 211, 126, 0.15)", color: "var(--neon)", border: "1px solid var(--neon)" }}>
                📂 {currentCategoryName}
              </span>
            </div>

            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" style={urlButtonStyle}>
                🔗 VISITAR ENLACE ORIGINAL
              </a>
            )}

            {item.content && (
              <div style={{ marginTop: "20px" }}>
                <pre style={preStyle}>{item.content}</pre>
              </div>
            )}

            {/* CONTROLES INFERIORES (EDITAR Y BORRAR) */}
            <div style={actionZoneStyle}>
              {isEditingCategory ? (
                <div style={editCategoryBoxStyle}>
                  <select
                    style={selectStyle}
                    value={newDirId}
                    onChange={(e) => setNewDirId(e.target.value)}
                  >
                    {directories.map(dir => (
                      <option key={dir.id} value={dir.id}>{dir.name}</option>
                    ))}
                  </select>
                  <button onClick={handleSaveCategory} disabled={actionLoading} style={saveBtnStyle}>
                    {actionLoading ? "Guardando..." : "✅ Confirmar"}
                  </button>
                  <button onClick={() => setIsEditingCategory(false)} style={cancelBtnStyle}>Cancelar</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                  <button onClick={handleModifyCategoryClick} style={editBtnStyle}>
                    ✏️ Cambiar de Carpeta
                  </button>
                  <button onClick={handleDelete} disabled={actionLoading} style={deleteBtnStyle}>
                    {actionLoading ? "Borrando..." : "🗑️ Eliminar"}
                  </button>
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}

// --- ESTILOS ---
const backdropStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
  backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
  justifyContent: "center", padding: 20, zIndex: 100000
};

const modalStyle = {
  width: "min(700px, 100%)", maxHeight: "90vh", borderRadius: 26,
  border: "2px solid rgba(70,211,126,.45)", background: "rgba(10,16,12,.95)",
  padding: 24, display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
};

const contentContainerStyle = { overflowY: "auto", paddingRight: "10px", scrollbarWidth: "thin", scrollbarColor: "rgba(70, 211, 126, 0.5) transparent" };
const iconBtn = { borderRadius: "50%", border: "1px solid rgba(70,211,126,.25)", background: "rgba(18,26,20,.35)", color: "white", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" };
const largeImageStyle = { width: "100%", maxHeight: "300px", objectFit: "cover", borderRadius: "16px", marginBottom: "20px", border: "1px solid rgba(255,255,255,0.1)" };
const titleStyle = { margin: "0 0 15px 0", fontSize: "1.8rem", color: "white", lineHeight: "1.3" };
const badgesContainerStyle = { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" };
const badgeStyle = { padding: "6px 12px", borderRadius: "20px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.8)", display: "flex", alignItems: "center", gap: "5px" };
const urlButtonStyle = { display: "block", width: "100%", padding: "15px", background: "rgba(70, 211, 126, 0.1)", border: "1px solid var(--neon)", borderRadius: "12px", color: "var(--neon)", textAlign: "center", textDecoration: "none", fontWeight: "bold", fontSize: "1rem", letterSpacing: "1px", transition: "all 0.2s", cursor: "pointer" };
const preStyle = { borderRadius: 16, border: "1px solid rgba(70,211,126,.18)", background: "rgba(0,0,0,.4)", padding: 18, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "1rem", lineHeight: "1.6", color: "rgba(255,255,255,0.9)", margin: 0 };

// Nuevos estilos de botones inferiores
const actionZoneStyle = { marginTop: "20px", paddingTop: "20px", borderTop: "1px dashed rgba(255,255,255,0.1)" };
const editBtnStyle = { flex: 1, padding: "12px", borderRadius: "12px", background: "rgba(33, 150, 243, 0.1)", border: "1px solid #2196F3", color: "#2196F3", fontWeight: "bold", cursor: "pointer" };
const deleteBtnStyle = { flex: 1, padding: "12px", borderRadius: "12px", background: "rgba(244, 67, 54, 0.1)", border: "1px solid #f44336", color: "#f44336", fontWeight: "bold", cursor: "pointer" };

const editCategoryBoxStyle = { display: "flex", gap: "10px", alignItems: "center", background: "rgba(255,255,255,0.05)", padding: "15px", borderRadius: "16px" };
const selectStyle = { flex: 1, padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", color: "white", border: "1px solid rgba(255,255,255,0.2)" };
const saveBtnStyle = { padding: "10px 15px", borderRadius: "8px", background: "var(--neon)", border: "none", color: "black", fontWeight: "bold", cursor: "pointer" };
const cancelBtnStyle = { padding: "10px 15px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "white", cursor: "pointer" };