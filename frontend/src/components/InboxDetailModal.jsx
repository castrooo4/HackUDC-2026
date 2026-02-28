// src/components/InboxDetailModal.jsx
import React, { useState, useEffect } from "react";
import { deleteInboxItem, updateInboxItem, getDirectoriesTree } from "../api/inbox";

import { 
  X, ExternalLink, Calendar, Folder, 
  Trash2, Edit3, Youtube, Globe, 
  FileText, ImageIcon, Brain, Check, RotateCcw 
} from "lucide-react";

import { Link } from "react-router-dom";

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
      YOUTUBE: { icon: <Youtube size={16} />, color: "#ff4444", label: "YouTube" },
      WEB: { icon: <Globe size={16} />, color: "#2196F3", label: "Web" },
      IMAGE: { icon: <ImageIcon size={16} />, color: "#9C27B0", label: "Imagen" },
      PDF: { icon: <FileText size={16} />, color: "#FF9800", label: "PDF" },
      TEXT: { icon: <Edit3 size={16} />, color: "#4CAF50", label: "Texto" }
    };
    return types[type] || { icon: <Brain size={16} />, color: "var(--neon)", label: type };
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Brain style={{ color: "var(--neon)" }} size={24} />
            <b style={{ color: "var(--neon)", fontSize: "1.2rem", letterSpacing: '1px' }}>MEMORIA DIGITAL</b>
          </div>
          <button onClick={onClose} style={iconBtn}><X size={20} /></button>
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

            {/* BADGES CON ICONOS LUCIDE */}
            <div style={badgesContainerStyle}>
              <span style={{ ...badgeStyle, borderColor: typeConfig.color, color: typeConfig.color }}>
                {typeConfig.icon} <span>{typeConfig.label}</span>
              </span>
              <span style={badgeStyle}>
                <Calendar size={14} /> <span>{formatDate(item.created_at)}</span>
              </span>
              {item.directory_id ? (
                <Link 
                  to={`/carpeta/${item.directory_id}`} 
                  onClick={onClose} // Cerramos el modal al navegar
                  style={{ 
                    ...badgeStyle, 
                    borderColor: 'var(--neon)', 
                    color: 'var(--neon)', 
                    background: 'rgba(70, 211, 126, 0.1)',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Folder size={14} /> <span>{currentCategoryName}</span>
                </Link>
              ) : (
                <span style={badgeStyle}>
                  <Folder size={14} /> <span>{currentCategoryName}</span>
                </span>
              )}
            </div>

            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" style={urlButtonStyle}>
                <ExternalLink size={18} /> VISITAR ENLACE ORIGINAL
              </a>
            )}

            {item.content && (
              <div style={{ marginTop: "20px" }}>
                <div style={contentLabelStyle}>CONTENIDO EXTRAÍDO</div>
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleSaveCategory} disabled={actionLoading} style={saveBtnStyle}>
                      <Check size={18} /> {actionLoading ? "..." : "Confirmar"}
                    </button>
                    <button onClick={() => setIsEditingCategory(false)} style={cancelBtnStyle}>
                       <RotateCcw size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                  <button onClick={handleModifyCategoryClick} style={editBtnStyle}>
                    <Folder size={18} /> Mover de Carpeta
                  </button>
                  <button onClick={handleDelete} disabled={actionLoading} style={deleteBtnStyle}>
                    <Trash2 size={18} /> {actionLoading ? "Borrando..." : "Eliminar de la memoria"}
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

// --- ESTILOS MEJORADOS ---
const backdropStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.8)",
  backdropFilter: "blur(8px)", display: "flex", alignItems: "center",
  justifyContent: "center", padding: 20, zIndex: 100000
};

const modalStyle = {
  width: "min(750px, 100%)", maxHeight: "90vh", borderRadius: 30,
  border: "2px solid rgba(70,211,126,.3)", background: "rgba(10,16,12,.98)",
  padding: 30, display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
};

const contentContainerStyle = { 
  overflowY: "auto", 
  paddingRight: "15px",
  scrollbarWidth: "thin",
  scrollbarColor: "var(--neon) transparent"
};

const iconBtn = { 
  borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", 
  background: "rgba(255,255,255,0.05)", color: "white", 
  width: "40px", height: "40px", display: "flex", alignItems: "center", 
  justifyContent: "center", cursor: "pointer", transition: "all 0.2s" 
};

const largeImageStyle = { 
  width: "100%", maxHeight: "350px", objectFit: "cover", 
  borderRadius: "20px", marginBottom: "25px", border: "1px solid rgba(70, 211, 126, 0.2)" 
};

const titleStyle = { 
  margin: "0 0 20px 0", fontSize: "1.8rem", color: "white", 
  lineHeight: "1.2", fontWeight: "800", wordBreak: 'break-word' 
};

const badgesContainerStyle = { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "25px" };

const badgeStyle = { 
  padding: "8px 14px", borderRadius: "12px", 
  background: "rgba(255, 255, 255, 0.03)", 
  border: "1px solid rgba(255, 255, 255, 0.1)", 
  fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.8)", 
  display: "flex", alignItems: "center", gap: "8px",
  fontWeight: "600"
};

const urlButtonStyle = { 
  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
  width: "100%", padding: "16px", background: "rgba(70, 211, 126, 0.1)", 
  border: "1px solid var(--neon)", borderRadius: "16px", color: "var(--neon)", 
  textDecoration: "none", fontWeight: "bold", fontSize: "0.9rem", 
  letterSpacing: "1px", transition: "all 0.3s", cursor: "pointer" 
};

const contentLabelStyle = {
  fontSize: '0.7rem', color: 'var(--neon)', fontWeight: 'bold', 
  letterSpacing: '2px', marginBottom: '8px', opacity: 0.8
};

const preStyle = { 
  borderRadius: 20, border: "1px solid rgba(255,255,255,0.05)", 
  background: "rgba(0,0,0,0.3)", padding: 20, whiteSpace: "pre-wrap", 
  fontFamily: "inherit", fontSize: "0.95rem", lineHeight: "1.6", 
  color: "rgba(215, 239, 224, 0.9)", margin: 0 
};

const actionZoneStyle = { 
  marginTop: "30px", paddingTop: "20px", 
  borderTop: "1px dashed rgba(70, 211, 126, 0.2)" 
};

const errorStyle = { 
  color: "#ff9393", padding: "20px", background: "rgba(255,90,90,0.1)", 
  borderRadius: "16px", border: "1px solid rgba(255,90,90,0.2)" 
};

const editBtnStyle = { 
  flex: 1, padding: "14px", borderRadius: "14px", background: "rgba(33, 150, 243, 0.1)", 
  border: "1px solid #2196F3", color: "#2196F3", fontWeight: "bold", 
  cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
};

const deleteBtnStyle = { 
  flex: 1, padding: "14px", borderRadius: "14px", background: "rgba(255, 90, 90, 0.05)", 
  border: "1px solid #ff5a5a", color: "#ff5a5a", fontWeight: "bold", 
  cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
};

const editCategoryBoxStyle = { 
  display: "flex", gap: "10px", alignItems: "center", 
  background: "rgba(70,211,126,0.05)", padding: "12px", borderRadius: "18px",
  border: "1px solid rgba(70,211,126,0.1)"
};

const selectStyle = { 
  flex: 1, 
  padding: "12px", 
  borderRadius: "10px", 
  background: "rgba(0,0,0,0.8)", // Fondo más oscuro para que resalte el neón
  color: "var(--neon)", // Texto en verde neón
  border: "1px solid rgba(70, 211, 126, 0.3)", 
  outline: 'none',
  appearance: 'none', // Quita la flecha por defecto en algunos navegadores
  cursor: 'pointer',
  fontSize: '0.95rem'
};

const saveBtnStyle = { 
  padding: "12px 20px", borderRadius: "10px", background: "var(--neon)", 
  border: "none", color: "black", fontWeight: "bold", cursor: "pointer",
  display: 'flex', alignItems: 'center', gap: '8px'
};

const cancelBtnStyle = { 
  padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", 
  border: "1px solid rgba(255,255,255,0.1)", color: "white", cursor: "pointer" 
};