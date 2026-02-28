import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, ExternalLink, Calendar, Folder, Trash2, Edit3, Youtube, Globe, FileText, ImageIcon, Brain, Check, RotateCcw } from "lucide-react";

import { deleteInboxItem, updateInboxItem, getDirectoriesTree } from "../api/inbox";

function flattenFolders(folders) {
  let flat = [];
  for (const folder of folders) {
    flat.push(folder);
    if (folder.children && folder.children.length > 0 && typeof folder.children[0] === "object") {
      flat = flat.concat(flattenFolders(folder.children));
    }
  }
  return flat;
}

function formatDate(dateString) {
  if (!dateString) return "Desconocida";
  return new Date(dateString).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTypeConfig(type) {
  const types = {
    YOUTUBE: { icon: <Youtube size={16} />, color: "#ff4444", label: "YouTube" },
    WEB: { icon: <Globe size={16} />, color: "#2196F3", label: "Web" },
    IMAGE: { icon: <ImageIcon size={16} />, color: "#9C27B0", label: "Imagen" },
    PDF: { icon: <FileText size={16} />, color: "#FF9800", label: "PDF" },
    TEXT: { icon: <Edit3 size={16} />, color: "#4CAF50", label: "Texto" },
  };
  return types[type] || { icon: <Brain size={16} />, color: "var(--neon)", label: type };
}

export default function InboxDetailModal({ open, item, loading, error, onClose }) {
  const [directories, setDirectories] = useState([]);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [newDirId, setNewDirId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setIsEditingCategory(false);
    getDirectoriesTree()
      .then((res) => setDirectories(flattenFolders(res?.roots || [])))
      .catch((fetchError) => console.error("Error al cargar carpetas en el modal:", fetchError));
  }, [open]);

  if (!open) return null;

  const typeConfig = item ? getTypeConfig(item.item_type) : null;
  const currentCategoryName = item?.directory_id
    ? directories.find((d) => d.id === item.directory_id)?.name || `Carpeta ${item.directory_id}`
    : "Sin clasificar (En Novedades)";

  const handleDelete = async () => {
    if (!window.confirm("Estas seguro de que quieres eliminar esta nota?")) return;

    setActionLoading(true);
    try {
      await deleteInboxItem(item.id);
      window.postMessage({ type: "REMIT_NEW_ITEM" }, "*");
      window.postMessage({ type: "REMIT_WEB_TOAST", message: "Elemento eliminado", toastType: "success" }, "*");
      onClose();
    } catch {
      window.postMessage({ type: "REMIT_WEB_TOAST", message: "Error al eliminar", toastType: "error" }, "*");
    } finally {
      setActionLoading(false);
    }
  };

  const handleModifyCategoryClick = () => {
    if (!item.directory_id) {
      window.postMessage({ type: "REMIT_WEB_TOAST", message: "Ve a Novedades para clasificarlo primero", toastType: "error" }, "*");
      return;
    }
    setNewDirId(item.directory_id);
    setIsEditingCategory(true);
  };

  const handleSaveCategory = async () => {
    const targetDirectoryId = Number.parseInt(newDirId, 10);
    if (!Number.isInteger(targetDirectoryId) || targetDirectoryId <= 0) {
      window.postMessage({ type: "REMIT_WEB_TOAST", message: "Selecciona una carpeta valida", toastType: "error" }, "*");
      return;
    }

    setActionLoading(true);
    try {
      await updateInboxItem(item.id, { directory_id: targetDirectoryId });
      window.postMessage({ type: "REMIT_NEW_ITEM" }, "*");
      window.postMessage({ type: "REMIT_WEB_TOAST", message: "Movido de carpeta con exito", toastType: "success" }, "*");
      setIsEditingCategory(false);
      onClose();
    } catch {
      window.postMessage({ type: "REMIT_WEB_TOAST", message: "Error al mover", toastType: "error" }, "*");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div onMouseDown={onClose} style={backdropStyle}>
      <div onMouseDown={(event) => event.stopPropagation()} style={modalStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Brain style={{ color: "var(--neon)" }} size={24} />
            <b style={{ color: "var(--neon)", fontSize: "1.2rem", letterSpacing: "1px" }}>MEMORIA DIGITAL</b>
          </div>
          <button onClick={onClose} style={iconBtn}><X size={20} /></button>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", opacity: 0.7 }}>Accediendo a la memoria...</div>
        ) : error ? (
          <div style={{ color: "#ffb3b3", padding: "20px", background: "rgba(255,0,0,0.1)", borderRadius: "12px" }}>{error}</div>
        ) : item ? (
          <div style={contentContainerStyle}>
            {item.preview_base64 && (
              <img
                src={item.preview_base64.startsWith("data:") ? item.preview_base64 : `data:image/jpeg;base64,${item.preview_base64}`}
                alt="Preview"
                style={largeImageStyle}
              />
            )}

            <h2 style={titleStyle}>{item.title || "Elemento sin titulo"}</h2>

            <div style={badgesContainerStyle}>
              <span style={{ ...badgeStyle, borderColor: typeConfig.color, color: typeConfig.color }}>
                {typeConfig.icon} <span>{typeConfig.label}</span>
              </span>
              <span style={badgeStyle}>
                <Calendar size={14} /> <span>{formatDate(item.created_at)}</span>
              </span>
              {(item.save_count || 1) > 1 ? (
                <span style={{ ...badgeStyle, borderColor: "rgba(70,211,126,0.4)", color: "var(--neon)" }}>
                  <span>Guardado x{item.save_count}</span>
                </span>
              ) : null}
              <span style={badgeStyle}>
                <span>Intentos: {item.processing_attempts || 0}</span>
              </span>
              {item.directory_id ? (
                <Link
                  to={`/carpeta/${item.directory_id}`}
                  onClick={onClose}
                  style={{
                    ...badgeStyle,
                    borderColor: "var(--neon)",
                    color: "var(--neon)",
                    background: "rgba(70, 211, 126, 0.1)",
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform = "scale(1)";
                  }}
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
                <div style={contentLabelStyle}>CONTENIDO EXTRAIDO</div>
                <pre style={preStyle}>{item.content}</pre>
              </div>
            )}

            {item.last_processing_error ? (
              <div style={errorBoxStyle}>
                <b>Ultimo error de procesado:</b>
                <div>{item.last_processing_error}</div>
              </div>
            ) : null}

            <div style={actionZoneStyle}>
              {isEditingCategory ? (
                <div style={editCategoryBoxStyle}>
                  <select style={selectStyle} value={newDirId} onChange={(event) => setNewDirId(event.target.value)}>
                    {directories.map((dir) => (
                      <option key={dir.id} value={dir.id}>{dir.name}</option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: "8px" }}>
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
                    <Folder size={18} /> Mover de carpeta
                  </button>
                  <button onClick={handleDelete} disabled={actionLoading} style={deleteBtnStyle}>
                    <Trash2 size={18} /> {actionLoading ? "Borrando..." : "Eliminar"}
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

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.8)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 100000,
};

const modalStyle = {
  width: "min(750px, 100%)",
  maxHeight: "90vh",
  borderRadius: 30,
  border: "2px solid rgba(70,211,126,.3)",
  background: "rgba(10,16,12,.98)",
  padding: 30,
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
};

const contentContainerStyle = {
  overflowY: "auto",
  paddingRight: "15px",
  scrollbarWidth: "thin",
  scrollbarColor: "var(--neon) transparent",
};

const iconBtn = {
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  width: "40px",
  height: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.2s",
};

const largeImageStyle = {
  width: "100%",
  maxHeight: "350px",
  objectFit: "cover",
  borderRadius: "20px",
  marginBottom: "25px",
  border: "1px solid rgba(70, 211, 126, 0.2)",
};

const titleStyle = {
  margin: "0 0 20px 0",
  fontSize: "1.8rem",
  color: "white",
  lineHeight: "1.2",
  fontWeight: "800",
  wordBreak: "break-word",
};

const badgesContainerStyle = { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "25px" };

const badgeStyle = {
  padding: "8px 14px",
  borderRadius: "12px",
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  fontSize: "0.85rem",
  color: "rgba(255, 255, 255, 0.8)",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontWeight: "600",
};

const urlButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  width: "100%",
  padding: "16px",
  background: "rgba(70, 211, 126, 0.1)",
  border: "1px solid var(--neon)",
  borderRadius: "16px",
  color: "var(--neon)",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "0.9rem",
  letterSpacing: "1px",
  transition: "all 0.3s",
  cursor: "pointer",
};

const contentLabelStyle = {
  fontSize: "0.7rem",
  color: "var(--neon)",
  fontWeight: "bold",
  letterSpacing: "2px",
  marginBottom: "8px",
  opacity: 0.8,
};

const preStyle = {
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.05)",
  background: "rgba(0,0,0,0.3)",
  padding: 20,
  whiteSpace: "pre-wrap",
  fontFamily: "inherit",
  fontSize: "0.95rem",
  lineHeight: "1.6",
  color: "rgba(215, 239, 224, 0.9)",
  margin: 0,
};

const errorBoxStyle = {
  marginTop: "16px",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(255, 170, 90, 0.35)",
  background: "rgba(255, 170, 90, 0.08)",
  color: "#ffd9b0",
  fontSize: "0.9rem",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const actionZoneStyle = {
  marginTop: "30px",
  paddingTop: "20px",
  borderTop: "1px dashed rgba(70, 211, 126, 0.2)",
};

const editBtnStyle = {
  flex: 1,
  padding: "14px",
  borderRadius: "14px",
  background: "rgba(33, 150, 243, 0.1)",
  border: "1px solid #2196F3",
  color: "#2196F3",
  fontWeight: "bold",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const deleteBtnStyle = {
  flex: 1,
  padding: "14px",
  borderRadius: "14px",
  background: "rgba(255, 90, 90, 0.05)",
  border: "1px solid #ff5a5a",
  color: "#ff5a5a",
  fontWeight: "bold",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const editCategoryBoxStyle = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  background: "rgba(70,211,126,0.05)",
  padding: "12px",
  borderRadius: "18px",
  border: "1px solid rgba(70,211,126,0.1)",
};

const selectStyle = {
  flex: 1,
  padding: "12px",
  borderRadius: "10px",
  background: "rgba(0,0,0,0.8)",
  color: "var(--neon)",
  border: "1px solid rgba(70, 211, 126, 0.3)",
  outline: "none",
  appearance: "none",
  cursor: "pointer",
  fontSize: "0.95rem",
};

const saveBtnStyle = {
  padding: "12px 20px",
  borderRadius: "10px",
  background: "var(--neon)",
  border: "none",
  color: "black",
  fontWeight: "bold",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const cancelBtnStyle = {
  padding: "12px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  cursor: "pointer",
};
