import React, { useEffect, useState } from "react";
import { GitMerge, Loader2, RotateCcw } from "lucide-react";

import { applyMergeSuggestion, listMergeSuggestions, rejectMergeSuggestion, revertMergeHistory } from "../api/inbox";

export default function MergeView({ onOpenDetail }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  async function fetchSuggestions() {
    setLoading(true);
    setError("");
    try {
      const data = await listMergeSuggestions(30);
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las sugerencias");
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(suggestion) {
    const sourceId = suggestion?.source_item?.id;
    const targetId = suggestion?.target_item?.id;
    if (!sourceId || !targetId) return;

    setPendingAction(`apply-${sourceId}`);
    try {
      const history = await applyMergeSuggestion(sourceId, targetId);
      setSuggestions((prev) => prev.filter((row) => row.source_item.id !== sourceId));
      setRecentHistory((prev) => [history, ...prev].slice(0, 8));
      window.postMessage({ type: "REMIT_NEW_ITEM" }, "*");
      window.postMessage({ type: "REMIT_WEB_TOAST", message: "Merge aplicado", toastType: "success" }, "*");
    } catch (err) {
      window.postMessage({ type: "REMIT_WEB_TOAST", message: err.message || "Error aplicando merge", toastType: "error" }, "*");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReject(suggestion) {
    const sourceId = suggestion?.source_item?.id;
    const targetId = suggestion?.target_item?.id;
    if (!sourceId || !targetId) return;

    setPendingAction(`reject-${sourceId}-${targetId}`);
    try {
      await rejectMergeSuggestion(sourceId, targetId);
      setSuggestions((prev) =>
        prev.filter((row) => !(row.source_item.id === sourceId && row.target_item.id === targetId))
      );
      window.postMessage({ type: "REMIT_NEW_ITEM" }, "*");
      window.postMessage({ type: "REMIT_WEB_TOAST", message: "Sugerencia rechazada", toastType: "success" }, "*");
    } catch (err) {
      window.postMessage({ type: "REMIT_WEB_TOAST", message: err.message || "Error rechazando sugerencia", toastType: "error" }, "*");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRevert(historyId) {
    if (!historyId) return;
    setPendingAction(`revert-${historyId}`);
    try {
      await revertMergeHistory(historyId);
      setRecentHistory((prev) => prev.filter((row) => row.id !== historyId));
      await fetchSuggestions();
      window.postMessage({ type: "REMIT_NEW_ITEM" }, "*");
      window.postMessage({ type: "REMIT_WEB_TOAST", message: "Merge revertido", toastType: "success" }, "*");
    } catch (err) {
      window.postMessage({ type: "REMIT_WEB_TOAST", message: err.message || "Error revirtiendo merge", toastType: "error" }, "*");
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return (
      <div style={loadingStyle}>
        <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "var(--neon)" }} />
        <span>Calculando merges sugeridos...</span>
      </div>
    );
  }

  if (error) {
    return <div style={errorStyle}>{error}</div>;
  }

  return (
    <div style={containerStyle}>
      <div style={titleRowStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <GitMerge size={24} color="var(--neon)" />
          <h2 style={{ margin: 0, color: "var(--neon)" }}>MERGE AUTOMATICO DE TEXTOS</h2>
        </div>
        <button type="button" style={refreshBtnStyle} onClick={fetchSuggestions}>Actualizar</button>
      </div>

      {recentHistory.length > 0 && (
        <div style={historyBlockStyle}>
          <h3 style={{ marginTop: 0 }}>Ultimos merges aplicados</h3>
          {recentHistory.map((row) => (
            <div key={row.id} style={historyRowStyle}>
              <span style={{ opacity: 0.9 }}>
                Historial #{row.id} · source #{row.source_item_id} {"->"} target #{row.target_item_id}
              </span>
              <button
                type="button"
                style={revertBtnStyle}
                onClick={() => handleRevert(row.id)}
                disabled={pendingAction === `revert-${row.id}`}
              >
                <RotateCcw size={14} />
                {pendingAction === `revert-${row.id}` ? "..." : "Revertir"}
              </button>
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 ? (
        <div style={emptyStyle}>No hay merges sugeridos en este momento.</div>
      ) : (
        <div style={listStyle}>
          {suggestions.map((row) => (
            <div key={`${row.source_item.id}-${row.target_item.id}`} style={cardStyle}>
              <div style={metaRowStyle}>
                <button type="button" style={linkBtnStyle} onClick={() => onOpenDetail(row.source_item.id)}>
                  Source #{row.source_item.id}: {row.source_item.title || "Sin titulo"}
                </button>
                <button type="button" style={linkBtnStyle} onClick={() => onOpenDetail(row.target_item.id)}>
                  Target #{row.target_item.id}: {row.target_item.title || "Sin titulo"}
                </button>
              </div>
              <div style={scoreStyle}>Similitud: {(row.similarity_score * 100).toFixed(1)}%</div>
              <pre style={previewStyle}>{row.preview_markdown}</pre>
              <div style={actionsRowStyle}>
                <button
                  type="button"
                  style={applyBtnStyle}
                  onClick={() => handleApply(row)}
                  disabled={pendingAction === `apply-${row.source_item.id}`}
                >
                  {pendingAction === `apply-${row.source_item.id}` ? "Aplicando..." : "Aplicar merge"}
                </button>
                <button
                  type="button"
                  style={rejectBtnStyle}
                  onClick={() => handleReject(row)}
                  disabled={pendingAction === `reject-${row.source_item.id}-${row.target_item.id}`}
                >
                  {pendingAction === `reject-${row.source_item.id}-${row.target_item.id}` ? "Rechazando..." : "Rechazar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const containerStyle = { display: "flex", flexDirection: "column", gap: 18 };
const titleRowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between" };
const loadingStyle = { padding: 28, display: "flex", gap: 12, alignItems: "center", opacity: 0.85 };
const errorStyle = { padding: 16, borderRadius: 12, color: "#ffc4c4", background: "rgba(255, 80, 80, 0.12)" };
const emptyStyle = { padding: 20, borderRadius: 14, opacity: 0.8, background: "rgba(255,255,255,0.02)" };
const listStyle = { display: "flex", flexDirection: "column", gap: 16 };
const cardStyle = {
  borderRadius: 18,
  border: "1px solid rgba(70,211,126,0.2)",
  background: "rgba(16, 22, 18, 0.8)",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
const metaRowStyle = { display: "flex", gap: 10, flexWrap: "wrap" };
const linkBtnStyle = {
  border: "1px solid rgba(70,211,126,0.25)",
  background: "rgba(70,211,126,0.08)",
  color: "#d9f6e3",
  borderRadius: 10,
  padding: "8px 10px",
  cursor: "pointer",
};
const scoreStyle = { fontSize: 12, letterSpacing: 0.3, color: "var(--neon)", opacity: 0.9 };
const previewStyle = {
  margin: 0,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  padding: 10,
  background: "rgba(0,0,0,0.28)",
  color: "#e7f8ee",
  maxHeight: 220,
  overflow: "auto",
  whiteSpace: "pre-wrap",
};
const applyBtnStyle = {
  alignSelf: "flex-start",
  border: "none",
  borderRadius: 10,
  padding: "8px 14px",
  cursor: "pointer",
  background: "var(--neon)",
  color: "#0b0f0d",
  fontWeight: 700,
};
const actionsRowStyle = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
const rejectBtnStyle = {
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 10,
  padding: "8px 14px",
  cursor: "pointer",
  background: "rgba(255,255,255,0.05)",
  color: "#ffffff",
  fontWeight: 600,
};
const refreshBtnStyle = {
  border: "1px solid rgba(70,211,126,0.35)",
  background: "rgba(70,211,126,0.08)",
  color: "var(--neon)",
  borderRadius: 10,
  padding: "8px 14px",
  cursor: "pointer",
};
const historyBlockStyle = {
  borderRadius: 14,
  border: "1px solid rgba(70,211,126,0.2)",
  background: "rgba(11,16,13,0.7)",
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
const historyRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const revertBtnStyle = {
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  borderRadius: 8,
  padding: "6px 10px",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};
