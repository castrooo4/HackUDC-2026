import React from "react";

import { INBOX_FILTER_TYPES } from "../utils/inboxFilters";

export default function InboxFilters({ filterType, onFilterTypeChange, searchQuery, onSearchQueryChange }) {
  return (
    <div style={containerStyle}>
      <input
        type="text"
        placeholder="Buscar en tu memoria..."
        style={searchBarStyle}
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
      />

      <div style={pillContainerStyle}>
        {INBOX_FILTER_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => onFilterTypeChange(type)}
            style={filterType === type ? activePillStyle : pillStyle}
          >
            {type === "ALL" ? "Todo" : type}
          </button>
        ))}
      </div>
    </div>
  );
}

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  marginBottom: "30px",
  alignItems: "center",
};

const searchBarStyle = {
  width: "100%",
  maxWidth: "600px",
  padding: "12px 25px",
  borderRadius: "50px",
  border: "none",
  background: "rgba(255,255,255,0.1)",
  color: "white",
  fontSize: "1rem",
  outline: "none",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};

const pillContainerStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "center",
};

const pillStyle = {
  padding: "8px 20px",
  borderRadius: "20px",
  border: "none",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
  fontWeight: "600",
  transition: "all 0.2s",
};

const activePillStyle = {
  ...pillStyle,
  background: "var(--neon)",
  color: "black",
};
