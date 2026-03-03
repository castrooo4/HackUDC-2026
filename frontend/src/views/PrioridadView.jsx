import React, { useEffect, useState } from "react";
import { AlertCircle, Loader2, MapPin, Target } from "lucide-react";

import { getTopReviewInbox } from "../api/inbox";
import { ENV } from "../config/env";

export default function PrioridadView({ onOpenDetail }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationHint, setLocationHint] = useState("");

  useEffect(() => {
    fetchRowsWithLocation();

    const handleSync = (event) => {
      if (event.data?.type === "REMIT_NEW_ITEM") {
        fetchRowsWithLocation();
      }
    };

    window.addEventListener("message", handleSync);
    return () => window.removeEventListener("message", handleSync);
  }, []);

  async function fetchRowsWithLocation() {
    const location = await getCurrentLocationSafe();
    if (location) {
      setLocationHint(`Priorizando con tu ubicación actual (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)})`);
    } else {
      setLocationHint("Priorizando sin ubicación actual");
    }
    await fetchRows(location);
  }

  async function fetchRows(location = null) {
    setLoading(true);
    setError("");
    try {
      const data = await getTopReviewInbox(10, location);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "No se pudo cargar la prioridad");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>
          <Loader2 className="animate-spin" size={28} style={{ color: "var(--neon)" }} />
          <span>Cargando Top 10 para revisar...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={errorStyle}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Target size={24} style={{ color: "var(--neon)" }} />
          <h2 style={{ margin: 0, color: "var(--neon)" }}>TOP 10 PARA REVISAR</h2>
        </div>
        <div style={badgeStyle}>{rows.length} ITEMS</div>
      </div>
      <p style={subtitleStyle}>
        Ranking de prioridad sobre todo tu inbox. Solo ayuda a decidir por donde empezar.
      </p>
      <p style={locationHintStyle}>{locationHint}</p>

      {rows.length === 0 ? (
        <div style={emptyStyle}>No hay elementos prioritarios ahora mismo.</div>
      ) : (
        <div style={listStyle}>
          {rows.map((row, idx) => {
            const item = row.item;
            const reason = getPriorityReason(row);

            return (
              <article key={item.id} style={cardStyle}>
                <div style={rankStyle}>#{idx + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={metaStyle}>
                    <span>{item.item_type}</span>
                    <span>{item.source}</span>
                  </div>
                  <div style={reasonPillStyle}>
                    <MapPin size={13} />
                    <span>{reason}</span>
                  </div>
                  <h3 style={titleStyle}>{item.title || `Entrada #${item.id}`}</h3>
                  <p style={contentStyle}>{item.content || item.url || "Sin contenido"}</p>
                </div>
                <div style={actionsStyle}>
                  <button style={secondaryButtonStyle} onClick={() => onOpenDetail(item.id)}>
                    Ver detalle
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

const containerStyle = { padding: "10px 0" };
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
};
const subtitleStyle = { margin: "0 0 16px 0", opacity: 0.8 };
const locationHintStyle = { margin: "-8px 0 16px 0", opacity: 0.6, fontSize: 12 };
const badgeStyle = {
  background: "rgba(70, 211, 126, 0.1)",
  border: "1px solid rgba(70, 211, 126, 0.35)",
  color: "var(--neon)",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  padding: "6px 12px",
};
const loadingStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "var(--card-bg)",
  border: "1px solid rgba(70, 211, 126, 0.2)",
  borderRadius: 18,
  padding: 18,
};
const errorStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#ff9393",
  background: "rgba(255, 90, 90, 0.1)",
  border: "1px solid rgba(255, 90, 90, 0.2)",
  borderRadius: 18,
  padding: 16,
};
const emptyStyle = {
  background: "var(--card-bg)",
  border: "1px dashed rgba(70, 211, 126, 0.2)",
  borderRadius: 18,
  padding: 20,
  opacity: 0.85,
};
const listStyle = { display: "flex", flexDirection: "column", gap: 14 };
const cardStyle = {
  background: "rgba(20, 25, 22, 0.6)",
  border: "1px solid rgba(70, 211, 126, 0.2)",
  borderRadius: 18,
  padding: 16,
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
};
const rankStyle = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "rgba(70, 211, 126, 0.12)",
  color: "var(--neon)",
  fontWeight: 700,
  flexShrink: 0,
};
const metaStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 6,
  opacity: 0.8,
  fontSize: 12,
  textTransform: "uppercase",
};
const titleStyle = { margin: "0 0 6px 0", fontSize: 20 };
const reasonPillStyle = {
  marginBottom: 8,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "var(--neon)",
  background: "rgba(70, 211, 126, 0.1)",
  border: "1px solid rgba(70, 211, 126, 0.3)",
  borderRadius: 999,
  padding: "4px 10px",
};
const contentStyle = {
  margin: 0,
  opacity: 0.8,
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
};
const actionsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 180,
};
const buttonBase = {
  borderRadius: 12,
  height: 38,
  padding: "0 12px",
  cursor: "pointer",
  border: "1px solid transparent",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};
const secondaryButtonStyle = {
  ...buttonBase,
  color: "white",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
};

function getPriorityReason(row) {
  const factors = row?.factors || {};
  const item = row?.item || {};
  const saveCount = Number(item.save_count || 1);

  const candidates = [
    { key: "location", value: Number(factors.location ?? 0), label: "En tu zona" },
    {
      key: "frequency",
      value: Math.max(Number(factors.frequency ?? 0), saveCount >= 2 ? 0.8 : 0),
      label: `Guardado varias veces (${saveCount})`,
    },
    { key: "metadata", value: Number(factors.metadata ?? 0), label: "Con datos útiles" },
    { key: "recency", value: Number(factors.recency ?? 0), label: "Reciente" },
  ];

  candidates.sort((a, b) => b.value - a.value);
  return candidates[0].label;
}

function getCurrentLocationSafe() {
  if (typeof window === "undefined" || !navigator?.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: ENV.GEOLOCATION_TIMEOUT_MS,
        maximumAge: 120000,
      },
    );
  });
}
