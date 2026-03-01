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
  gap: "16px",
  marginBottom: "24px",
  alignItems: "center",
  width: "100%",
};

const searchBarStyle = {
  width: "100%",
  maxWidth: "600px",
  padding: "14px 25px",
  borderRadius: "50px",
  border: "1px solid rgba(70, 211, 126, 0.2)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  fontSize: "1rem",
  outline: "none",
  boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
};

const pillContainerStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "nowrap",
  overflowX: "auto",
  width: "100%",
  padding: "5px 5px 15px 5px",
  scrollbarWidth: "none", 
  WebkitOverflowScrolling: "touch",
  justifyContent: window.innerWidth > 768 ? "center" : "flex-start",
};

const pillStyle = {
  padding: "8px 22px",
  borderRadius: "20px",
  border: "1px solid rgba(70, 211, 126, 0.3)",
  background: "rgba(70, 211, 126, 0.05)",
  color: "var(--text)",
  cursor: "pointer",
  fontWeight: "600",
  transition: "all 0.2s",
  whiteSpace: "nowrap",
  fontSize: "0.9rem",
};

const activePillStyle = {
  ...pillStyle,
  background: "var(--neon)",
  color: "#0b0f0d",
  border: "1px solid var(--neon)",
  boxShadow: "0 0 15px rgba(70, 211, 126, 0.4)",
};
