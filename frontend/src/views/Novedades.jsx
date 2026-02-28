import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, Folder, CheckCircle2, PartyPopper, Brain, PlusCircle } from "lucide-react";

import { getPendingInbox, getDirectoriesTree, confirmOrganization } from "../api/inbox";

export default function Novedades({ onOpenDetail }) {
  const [pendingItems, setPendingItems] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);

  async function handleConfirmAll() {
    if (!pendingItems.length) return;
    if (!window.confirm(`¿Confirmar las ${pendingItems.length} sugerencias automáticamente?`)) return;

    setIsConfirmingAll(true);
    try {
      // Ejecutamos todas las confirmaciones en paralelo
      await Promise.all(
        pendingItems.map(item => confirmOrganization(item.id, { type: "RECOMMENDED" }))
      );
      setPendingItems([]); // Limpiamos la lista una vez terminadas todas
      window.postMessage({ type: "REMIT_WEB_TOAST", message: "Todo organizado con éxito", toastType: "success" }, "*");
    } catch (err) {
      alert(`Error al organizar algunos elementos: ${err.message}`);
      fetchData(); // Refrescamos para ver qué quedó pendiente
    } finally {
      setIsConfirmingAll(false);
    }
  }

  useEffect(() => {
    fetchData();

    const handleSync = (event) => {
      if (event.data?.type === "REMIT_NEW_ITEM") {
        fetchData();
      }
    };

    window.addEventListener("message", handleSync);
    return () => window.removeEventListener("message", handleSync);
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [itemsData, dirsData] = await Promise.all([getPendingInbox(), getDirectoriesTree()]);
      setPendingItems(Array.isArray(itemsData) ? itemsData : []);
      setDirectories(dirsData?.roots || []);
    } catch (err) {
      setError(err.message || "Error al cargar las novedades");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(itemId, option) {
    try {
      await confirmOrganization(itemId, option);
      setPendingItems((prev) => prev.filter((item) => item.id !== itemId));
      setNewFolderName("");
    } catch (err) {
      alert(`Error al organizar: ${err.message}`);
      if (err.message.includes("409")) fetchData();
    }
  }

  const getSuggestedName = (dirId) => {
    if (!dirId) return "carpeta sugerida";

    let foundName = null;
    const searchFolder = (folders) => {
      for (const folder of folders) {
        if (folder.id === dirId) foundName = folder.name;
        if (!foundName && folder.children && folder.children.length > 0 && typeof folder.children[0] === "object") {
          searchFolder(folder.children);
        }
      }
    };
    searchFolder(directories);

    return foundName || `Carpeta ${dirId}`;
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>
          <Loader2 className="animate-spin" size={32} style={{ marginBottom: "10px", color: "var(--neon)" }} />
          <div>Sincronizando clasificacion...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={errorStyle}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerSectionStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <Sparkles style={{ color: "var(--neon)" }} size={28} />
          <h2 style={{ margin: 0, color: "var(--neon)", letterSpacing: "1px" }}>BANDEJA DE CLASIFICACION</h2>
        </div>
        {/* Contenedor de botones a la derecha */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={badgeStyle}>{pendingItems.length} PENDIENTES</div>
          
          {pendingItems.length > 0 && (
            <button 
              onClick={handleConfirmAll} 
              disabled={isConfirmingAll}
              style={confirmAllBtnStyle}
            >
              {isConfirmingAll ? "PROCESANDO..." : "CONFIRMAR TODO"}
            </button>
          )}
        </div>
      </div>

      <p style={{ opacity: 0.7, marginBottom: "30px" }}>
        Estos elementos ya tienen una carpeta recomendada. Confirma o cambia el destino para moverlos al inbox principal.
      </p>

      {pendingItems.length === 0 ? (
        <div style={emptyStyle}>
          <PartyPopper size={48} style={{ color: "var(--neon)", marginBottom: "15px", opacity: 0.8 }} />
          <h3 style={{ margin: 0, color: "var(--neon)", letterSpacing: "1px" }}>TODO ORGANIZADO</h3>
          <p style={{ opacity: 0.6 }}>No hay elementos pendientes de validacion.</p>
        </div>
      ) : (
        <div style={gridStyle}>
          {pendingItems.map((item) => (
            <div key={item.id} style={cardNovedadStyle}>
              <div style={itemHeaderStyle} onClick={() => onOpenDetail(item.id)} title="Haz click para ver detalle">
                <div style={{ flex: 1 }}>
                  <div style={sourceTagStyle}>{item.item_type} - {item.source}</div>
                  <h3 style={itemTitleStyle}>{item.title || `Entrada #${item.id}`}</h3>
                  {item.content && <p style={contentPreviewStyle}>{item.content}</p>}
                </div>

                {item.preview_base64 && (
                  <div style={imageWrapperStyle}>
                    <img
                      src={item.preview_base64.startsWith("data:") ? item.preview_base64 : `data:image/jpeg;base64,${item.preview_base64}`}
                      alt="Preview"
                      style={previewImageStyle}
                    />
                  </div>
                )}
              </div>

              <div style={actionSectionStyle}>
                <button style={btnSuggestStyle} onClick={() => handleConfirm(item.id, { type: "RECOMMENDED" })}>
                  <Brain size={18} />
                  <span style={{ flex: 1, textAlign: "left" }}>
                    Aceptar sugerencia: <b>{getSuggestedName(item.directory_id)}</b>
                  </span>
                  <CheckCircle2 size={18} />
                </button>

                <div style={bottomActionsRow}>
                  <div style={selectWrapperStyle}>
                    <Folder size={16} style={selectIconStyle} />
                    <select
                      style={selectStyle}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleConfirm(item.id, { type: "EXISTING", id: Number.parseInt(e.target.value, 10) });
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Mover a carpeta...</option>
                      {directories.map((dir) => (
                        <option key={dir.id} value={dir.id}>{dir.name || `Carpeta ${dir.id}`}</option>
                      ))}
                    </select>
                  </div>

                  <div style={inputWrapperStyle}>
                    <PlusCircle size={16} style={selectIconStyle} />
                    <input
                      type="text"
                      placeholder="Nueva carpeta (Enter)..."
                      style={inputStyle}
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newFolderName.trim()) {
                          handleConfirm(item.id, { type: "NEW", name: newFolderName.trim() });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const containerStyle = { padding: "10px 0" };
const headerSectionStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" };

const loadingStyle = {
  padding: "60px",
  textAlign: "center",
  opacity: 0.9,
  color: "var(--text)",
  background: "var(--card-bg)",
  borderRadius: "30px",
  border: "1px solid rgba(70,211,126,0.1)",
};

const emptyStyle = {
  padding: "60px 20px",
  textAlign: "center",
  background: "var(--card-bg)",
  borderRadius: "30px",
  border: "2px dashed rgba(70, 211, 126, 0.15)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const badgeStyle = {
  background: "rgba(70, 211, 126, 0.1)",
  color: "var(--neon)",
  padding: "6px 16px",
  borderRadius: "12px",
  fontSize: "0.75rem",
  fontWeight: "800",
  border: "1px solid rgba(70, 211, 126, 0.3)",
  letterSpacing: "1px",
};

const gridStyle = { display: "flex", flexDirection: "column", gap: "30px" };

const cardNovedadStyle = {
  background: "rgba(20, 25, 22, 0.6)",
  border: "1px solid rgba(70, 211, 126, 0.2)",
  padding: "25px",
  borderRadius: "30px",
  boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
  transition: "all 0.3s ease",
  position: "relative",
  overflow: "hidden",
};

const itemHeaderStyle = {
  display: "flex",
  gap: "25px",
  marginBottom: "25px",
  alignItems: "flex-start",
  cursor: "pointer",
};

const sourceTagStyle = {
  color: "var(--neon)",
  fontSize: "0.65rem",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: "2px",
  opacity: 0.7,
  marginBottom: "8px",
};

const itemTitleStyle = {
  margin: "0 0 12px 0",
  color: "white",
  fontSize: "1.4rem",
  fontWeight: "800",
  lineHeight: "1.2",
};

const contentPreviewStyle = {
  color: "rgba(215, 239, 224, 0.7)",
  fontSize: "0.95rem",
  lineHeight: "1.6",
  margin: 0,
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const imageWrapperStyle = {
  width: "160px",
  height: "110px",
  borderRadius: "16px",
  overflow: "hidden",
  border: "1px solid rgba(70, 211, 126, 0.2)",
  flexShrink: 0,
};

const previewImageStyle = { width: "100%", height: "100%", objectFit: "cover" };

const actionSectionStyle = {
  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
  paddingTop: "25px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const btnSuggestStyle = {
  width: "100%",
  background: "rgba(70, 211, 126, 0.08)",
  color: "var(--neon)",
  border: "1px solid rgba(70, 211, 126, 0.4)",
  padding: "16px",
  borderRadius: "16px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "0.95rem",
  transition: "all 0.2s",
  display: "flex",
  alignItems: "center",
  gap: "15px",
};

const bottomActionsRow = { display: "flex", gap: "12px", flexWrap: "wrap" };
const selectWrapperStyle = { position: "relative", flex: 1, minWidth: "220px" };
const inputWrapperStyle = { position: "relative", flex: 1, minWidth: "220px" };

const selectIconStyle = {
  position: "absolute",
  left: "15px",
  top: "50%",
  transform: "translateY(-50%)",
  color: "rgba(255,255,255,0.4)",
  pointerEvents: "none",
};

const selectStyle = {
  width: "100%",
  padding: "14px 14px 14px 45px",
  borderRadius: "14px",
  background: "rgba(0,0,0,0.3)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.1)",
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  fontSize: "0.9rem",
};

const inputStyle = {
  width: "100%",
  padding: "14px 14px 14px 45px",
  borderRadius: "14px",
  background: "rgba(0,0,0,0.3)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.1)",
  outline: "none",
  fontSize: "0.9rem",
};

const errorStyle = {
  color: "#ff9393",
  padding: "20px",
  background: "rgba(255,90,90,0.1)",
  borderRadius: "16px",
  border: "1px solid rgba(255,90,90,0.2)",
};

const confirmAllBtnStyle = {
  background: "var(--neon)",
  color: "#0b0f0d",
  border: "none",
  padding: "6px 16px",
  borderRadius: "12px",
  fontSize: "0.75rem",
  fontWeight: "800",
  cursor: "pointer",
  letterSpacing: "1px",
  transition: "all 0.2s",
  opacity: 0.9,
};