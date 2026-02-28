import React, { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { MapPinned } from "lucide-react";

const DEFAULT_CENTER = [40.4168, -3.7038];
const DEFAULT_ZOOM = 5;
const MAP_PIN_ICON = L.divIcon({
  className: "remit-map-pin-wrapper",
  html: '<div class="remit-map-pin"></div>',
  iconSize: [26, 36],
  iconAnchor: [13, 34],
  popupAnchor: [0, -28],
});

export default function MapaView({ items = [], onOpenDetail }) {
  const locationItems = useMemo(
    () =>
      (items || []).filter(
        (item) =>
          item.location_lat !== null &&
          item.location_lat !== undefined &&
          item.location_lon !== null &&
          item.location_lon !== undefined &&
          Number.isFinite(Number(item.location_lat)) &&
          Number.isFinite(Number(item.location_lon))
      ),
    [items]
  );

  const mapCenter = useMemo(() => {
    if (locationItems.length === 0) return DEFAULT_CENTER;
    const latAvg =
      locationItems.reduce((acc, item) => acc + Number(item.location_lat), 0) /
      locationItems.length;
    const lonAvg =
      locationItems.reduce((acc, item) => acc + Number(item.location_lon), 0) /
      locationItems.length;
    return [latAvg, lonAvg];
  }, [locationItems]);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          <MapPinned size={28} />
          Mapa de Inbox
        </h2>
        <div style={badgeStyle}>{locationItems.length} con ubicacion</div>
      </div>

      {locationItems.length === 0 ? (
        <div style={emptyStyle}>
          No hay inbox con coordenadas para mostrar en el mapa.
        </div>
      ) : (
        <div style={mapWrapperStyle}>
          <MapContainer
            center={mapCenter}
            zoom={DEFAULT_ZOOM}
            style={mapStyle}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {locationItems.map((item) => (
              <Marker
                key={item.id}
                position={[Number(item.location_lat), Number(item.location_lon)]}
                icon={MAP_PIN_ICON}
              >
                <Popup>
                  <div style={popupStyle}>
                    <div style={popupType}>
                      {item.item_type} - {item.source}
                    </div>
                    <div style={popupTitle}>{item.title || `Inbox #${item.id}`}</div>
                    {item.location_city ? (
                      <div style={popupCity}>{item.location_city}</div>
                    ) : null}
                    <button
                      style={popupBtnStyle}
                      onClick={() => onOpenDetail(item.id)}
                    >
                      Ver detalle
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}

const containerStyle = { padding: "10px 0", color: "var(--text)" };

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 16,
};

const titleStyle = {
  margin: 0,
  color: "var(--neon)",
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const badgeStyle = {
  background: "rgba(70, 211, 126, 0.1)",
  color: "var(--neon)",
  padding: "6px 14px",
  borderRadius: 12,
  fontSize: "0.8rem",
  fontWeight: 700,
  border: "1px solid rgba(70, 211, 126, 0.25)",
};

const mapWrapperStyle = {
  borderRadius: 26,
  overflow: "hidden",
  border: "1px solid rgba(70, 211, 126, 0.25)",
  background: "var(--card-bg)",
  minHeight: "68vh",
};

const mapStyle = {
  width: "100%",
  height: "68vh",
  minHeight: 460,
};

const emptyStyle = {
  padding: "60px 20px",
  borderRadius: 24,
  border: "1px dashed rgba(70, 211, 126, 0.3)",
  background: "var(--card-bg)",
  textAlign: "center",
  opacity: 0.85,
};

const popupStyle = { minWidth: 180, display: "flex", flexDirection: "column", gap: 8 };
const popupType = { fontSize: "0.75rem", opacity: 0.7 };
const popupTitle = { fontWeight: 700, fontSize: "0.9rem" };
const popupCity = { fontSize: "0.8rem", opacity: 0.85 };
const popupBtnStyle = {
  border: "1px solid rgba(70, 211, 126, 0.45)",
  background: "rgba(70, 211, 126, 0.15)",
  color: "#1f6b3f",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 700,
};
