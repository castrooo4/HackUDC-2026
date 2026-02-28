import React, { useEffect, useMemo, useState } from "react";
import { Building2, MapPin } from "lucide-react";

import { listCities, listInboxByCity } from "../api/inbox";
import CardGrid from "../components/CardGrid";

export default function CiudadesView({ onOpenDetail, onDeleteItem }) {
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [cityItems, setCityItems] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    if (!selectedCity) {
      setCityItems([]);
      return;
    }
    loadItemsByCity(selectedCity);
  }, [selectedCity]);

  async function loadCities() {
    setLoadingCities(true);
    setError("");
    try {
      const data = await listCities();
      const normalized = Array.isArray(data) ? data : [];
      setCities(normalized);
      if (normalized.length > 0) {
        setSelectedCity(normalized[0].city);
      }
    } catch (e) {
      setError(e?.message || "No se pudieron cargar las ciudades");
    } finally {
      setLoadingCities(false);
    }
  }

  async function loadItemsByCity(city) {
    setLoadingItems(true);
    setError("");
    try {
      const data = await listInboxByCity(city);
      setCityItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar los inbox de la ciudad");
    } finally {
      setLoadingItems(false);
    }
  }

  const selectedCityCount = useMemo(() => {
    const found = cities.find((c) => c.city === selectedCity);
    return found?.item_count ?? cityItems.length;
  }, [cities, selectedCity, cityItems.length]);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          <Building2 size={28} />
          Inbox por Ciudad
        </h2>
        <div style={badgeStyle}>{cities.length} ciudades</div>
      </div>

      {error ? <div style={errorStyle}>Error: {error}</div> : null}

      {loadingCities ? (
        <div style={loadingStyle}>Cargando ciudades...</div>
      ) : cities.length === 0 ? (
        <div style={emptyStyle}>No hay ciudades con inbox geolocalizados.</div>
      ) : (
        <>
          <div style={cityGridStyle}>
            {cities.map((city) => {
              const isSelected = city.city === selectedCity;
              return (
                <button
                  key={city.city}
                  type="button"
                  onClick={() => setSelectedCity(city.city)}
                  style={{
                    ...cityCardStyle,
                    ...(isSelected ? cityCardActiveStyle : cityCardIdleStyle),
                  }}
                >
                  <div style={cityCardTitleRowStyle}>
                    <MapPin size={16} />
                    <span style={cityCardTitleStyle}>{city.city}</span>
                  </div>
                  <div style={cityCardCountStyle}>{city.item_count} inbox</div>
                </button>
              );
            })}
          </div>

          {loadingItems ? (
            <div style={loadingStyle}>Cargando inbox de {selectedCity}...</div>
          ) : cityItems.length === 0 ? (
            <div style={emptyStyle}>No hay inbox para {selectedCity}.</div>
          ) : (
            <>
              <div style={subHeaderStyle}>
                <div style={subTitleStyle}>{selectedCity}</div>
                <div style={subCountStyle}>{selectedCityCount} items</div>
              </div>
              <CardGrid items={cityItems} setItems={setCityItems} onOpen={onOpenDetail} onDelete={onDeleteItem} />
            </>
          )}
        </>
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
const cityGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 14,
  marginBottom: 14,
};
const cityCardStyle = {
  borderRadius: 18,
  border: "1px solid transparent",
  padding: "14px 16px",
  textAlign: "left",
  cursor: "pointer",
  transition: "all 0.2s ease",
  background: "var(--card-bg)",
  color: "var(--text)",
};
const cityCardIdleStyle = {
  borderColor: "rgba(215, 239, 224, 0.15)",
};
const cityCardActiveStyle = {
  borderColor: "rgba(70, 211, 126, 0.5)",
  boxShadow: "0 0 0 2px rgba(70, 211, 126, 0.15)",
  transform: "translateY(-1px)",
};
const cityCardTitleRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "var(--neon)",
  marginBottom: 6,
};
const cityCardTitleStyle = {
  fontWeight: 700,
  fontSize: "0.98rem",
  lineHeight: 1.1,
};
const cityCardCountStyle = {
  fontSize: "0.82rem",
  opacity: 0.8,
};
const subHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 12,
};
const subTitleStyle = { fontWeight: 700, color: "var(--neon)", fontSize: "1rem" };
const subCountStyle = { fontSize: "0.85rem", opacity: 0.75 };
const loadingStyle = {
  marginTop: 10,
  padding: 18,
  borderRadius: 14,
  border: "1px solid rgba(70, 211, 126, 0.15)",
  background: "var(--card-bg)",
};
const emptyStyle = {
  marginTop: 10,
  padding: 28,
  borderRadius: 16,
  border: "1px dashed rgba(70, 211, 126, 0.3)",
  background: "var(--card-bg)",
  textAlign: "center",
  opacity: 0.85,
};
const errorStyle = {
  marginTop: 8,
  marginBottom: 10,
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255, 120, 120, 0.35)",
  color: "#ff9a9a",
  background: "rgba(255, 90, 90, 0.08)",
};
