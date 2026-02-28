import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  return (
    <div style={sidebarStyle}>
      <div style={logoStyle}>BRAIN</div>
      <nav style={navStyle}>
        <Link to="/" style={location.pathname === "/" ? activeLinkStyle : linkStyle}>
          🏠 Principal
        </Link>
        <Link to="/novedades" style={location.pathname === "/novedades" ? activeLinkStyle : linkStyle}>
          ✨ Novedades
        </Link>
      </nav>
    </div>
  );
}

const sidebarStyle = {
  width: "240px",
  height: "100vh",
  position: "fixed",
  left: 0,
  top: 0,
  background: "var(--card-bg)",
  borderRight: "1px solid rgba(70, 211, 126, 0.2)",
  padding: "40px 20px",
  zIndex: 100
};

const logoStyle = {
  color: "var(--neon)",
  fontWeight: "800",
  fontSize: "24px",
  marginBottom: "40px",
  textAlign: "center"
};

const navStyle = { display: "flex", flexDirection: "column", gap: "15px" };

const linkStyle = {
  color: "var(--text)",
  textDecoration: "none",
  padding: "12px",
  borderRadius: "12px",
  transition: "all 0.3s"
};

const activeLinkStyle = {
  ...linkStyle,
  background: "rgba(70, 211, 126, 0.15)",
  color: "var(--neon)",
  fontWeight: "bold"
};