import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Sparkles, Folder, ChevronDown, MapPinned, Building2, GitMerge, ListChecks } from "lucide-react";

import { getDirectoriesTree } from "../api/inbox";
import logoImg from "../assets/remit-logo.png";

function flattenFolders(nodes) {
  const flat = [];
  for (const node of nodes) {
    flat.push(node);
    if (node.children && node.children.length > 0 && typeof node.children[0] === "object") {
      flat.push(...flattenFolders(node.children));
    }
  }
  return flat;
}

export default function Sidebar() {
  const location = useLocation();
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  const handleToggleFolders = async () => {
    const willOpen = !foldersOpen;
    setFoldersOpen(willOpen);

    if (!willOpen) return;

    setLoadingFolders(true);
    try {
      const data = await getDirectoriesTree();
      setFolders(flattenFolders(data?.roots || []));
    } catch (error) {
      console.error("Error al cargar carpetas:", error);
    } finally {
      setLoadingFolders(false);
    }
  };

  return (
    <div style={sidebarStyle}>
      <div style={logoContainerStyle}>
        <img src={logoImg} alt="Digital Brain Logo" style={logoImageStyle} />
      </div>

      <nav style={navStyle}>
        <Link to="/" style={location.pathname === "/" ? activeLinkStyle : linkStyle}>
          <Home size={20} />
          <span>Principal</span>
        </Link>

        <Link to="/novedades" style={location.pathname === "/novedades" ? activeLinkStyle : linkStyle}>
          <Sparkles size={20} />
          <span>Novedades</span>
        </Link>

        <Link to="/prioridad" style={location.pathname === "/prioridad" ? activeLinkStyle : linkStyle}>
          <ListChecks size={20} />
          <span>Prioridad</span>
        </Link>

        <Link to="/mapa" style={location.pathname === "/mapa" ? activeLinkStyle : linkStyle}>
          <MapPinned size={20} />
          <span>Mapa</span>
        </Link>

        <Link to="/ciudades" style={location.pathname === "/ciudades" ? activeLinkStyle : linkStyle}>
          <Building2 size={20} />
          <span>Ciudades</span>
        </Link>

        <Link to="/merge" style={location.pathname === "/merge" ? activeLinkStyle : linkStyle}>
          <GitMerge size={20} />
          <span>Merge</span>
        </Link>

        <div style={folderToggleStyle} onClick={handleToggleFolders}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Folder size={20} />
              <span>Carpetas</span>
            </span>
            <span style={{ display: "flex", transform: foldersOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", opacity: 0.5 }}>
              <ChevronDown size={16} />
            </span>
          </div>
        </div>

        {foldersOpen && (
          <div style={folderListStyle}>
            {loadingFolders ? (
              <div style={{ opacity: 0.5, fontSize: "0.8rem", padding: "10px" }}>Cargando...</div>
            ) : folders.length === 0 ? (
              <div style={{ opacity: 0.5, fontSize: "0.8rem", padding: "10px" }}>No hay carpetas</div>
            ) : (
              folders.map((folder) => {
                const path = `/carpeta/${folder.id}`;
                const isActive = location.pathname === path;
                return (
                  <Link key={folder.id} to={path} style={isActive ? activeSubLinkStyle : subLinkStyle}>
                    {folder.name}
                  </Link>
                );
              })
            )}
          </div>
        )}
      </nav>
    </div>
  );
}

const linkStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "var(--text)",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: "16px",
  transition: "all 0.3s",
  fontSize: "0.95rem",
};

const activeLinkStyle = {
  ...linkStyle,
  background: "rgba(70, 211, 126, 0.1)",
  color: "var(--neon)",
  fontWeight: "600",
};

const sidebarStyle = {
  width: "240px",
  height: "100vh",
  position: "fixed",
  left: 0,
  top: 0,
  background: "var(--card-bg)",
  borderRight: "1px solid rgba(70, 211, 126, 0.2)",
  padding: "40px 20px",
  zIndex: 100,
  overflowY: "auto",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

const navStyle = { display: "flex", flexDirection: "column", gap: "10px" };

const folderToggleStyle = {
  ...linkStyle,
  cursor: "pointer",
  userSelect: "none",
};

const folderListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  marginLeft: "15px",
  borderLeft: "2px solid rgba(70, 211, 126, 0.2)",
  paddingLeft: "10px",
  marginTop: "-5px",
};

const subLinkStyle = {
  color: "var(--text)",
  textDecoration: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  fontSize: "0.9rem",
  transition: "all 0.2s",
  opacity: 0.8,
};

const activeSubLinkStyle = {
  ...subLinkStyle,
  background: "rgba(70, 211, 126, 0.1)",
  color: "var(--neon)",
  fontWeight: "bold",
  opacity: 1,
};

const logoContainerStyle = {
  textAlign: "center",
  marginBottom: "40px",
};

const logoImageStyle = {
  width: "50%",
  maxWidth: "150px",
  height: "auto",
  filter: "drop-shadow(0 0 10px rgba(70, 211, 126, 0.3))",
};
