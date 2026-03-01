import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Sparkles, MapPinned, Building2 } from "lucide-react";

export default function MobileNav() {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: <Home size={24} />, label: "Inicio" },
    { path: "/novedades", icon: <Sparkles size={24} />, label: "Novedades" },
    { path: "/mapa", icon: <MapPinned size={24} />, label: "Mapa" },
    { path: "/ciudades", icon: <Building2 size={24} />, label: "Ciudades" },
  ];

  return (
    <div style={mobileNavStyle}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link key={item.path} to={item.path} style={linkStyle}>
            <div style={isActive ? activeIconStyle : iconStyle}>
              {item.icon}
            </div>
            <span style={{ ...labelStyle, color: isActive ? "var(--neon)" : "var(--muted)" }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

const mobileNavStyle = {
  position: "fixed",
  bottom: 0,
  left: 0,
  width: "100%",
  height: "70px",
  background: "rgba(10, 16, 12, 0.95)",
  backdropFilter: "blur(10px)",
  borderTop: "1px solid rgba(70, 211, 126, 0.2)",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  zIndex: 1000,
  paddingBottom: "env(safe-area-inset-bottom)",
};

const linkStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textDecoration: "none",
  gap: "4px",
  flex: 1,
};

const iconStyle = {
  color: "var(--text)",
  opacity: 0.6,
  transition: "all 0.3s ease",
};

const activeIconStyle = {
  color: "var(--neon)",
  transform: "translateY(-4px)",
  filter: "drop-shadow(0 0 8px rgba(70, 211, 126, 0.5))",
};

const labelStyle = {
  fontSize: "0.65rem",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};