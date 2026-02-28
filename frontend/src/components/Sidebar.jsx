// src/components/Sidebar.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getDirectoriesTree } from "../api/inbox";

export default function Sidebar() {
  const location = useLocation();
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // Al abrir el desplegable, pedimos las carpetas frescas al backend
  const handleToggleFolders = async () => {
    const willOpen = !foldersOpen;
    setFoldersOpen(willOpen);

    if (willOpen) {
      setLoadingFolders(true);
      try {
        const data = await getDirectoriesTree();

        // Función para aplanar el árbol por si hay subcarpetas
        const flattenFolders = (foldersArr) => {
          let flat = [];
          for (const f of foldersArr) {
            flat.push(f);
            if (f.children && f.children.length > 0 && typeof f.children[0] === 'object') {
              flat = flat.concat(flattenFolders(f.children));
            }
          }
          return flat;
        };

        setFolders(flattenFolders(data?.roots || []));
      } catch (e) {
        console.error("Error al cargar carpetas:", e);
      } finally {
        setLoadingFolders(false);
      }
    }
  };

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

        {/* EL BOTÓN DESPLEGABLE DE CARPETAS */}
        <div style={folderToggleStyle} onClick={handleToggleFolders}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📁 Carpetas</span>
            <span style={{ fontSize: '0.8rem', transform: foldersOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
              ▼
            </span>
          </div>
        </div>

        {/* LA LISTA DE CARPETAS DESPLEGADA */}
        {foldersOpen && (
          <div style={folderListStyle}>
            {loadingFolders ? (
              <div style={{ opacity: 0.5, fontSize: '0.8rem', padding: '10px' }}>Cargando...</div>
            ) : folders.length === 0 ? (
              <div style={{ opacity: 0.5, fontSize: '0.8rem', padding: '10px' }}>No hay carpetas</div>
            ) : (
              folders.map(f => {
                const path = `/carpeta/${f.id}`;
                const isActive = location.pathname === path;
                return (
                  <Link key={f.id} to={path} style={isActive ? activeSubLinkStyle : subLinkStyle}>
                    {f.name}
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

// --- ESTILOS ---
const sidebarStyle = {
  width: "240px", height: "100vh", position: "fixed", left: 0, top: 0,
  background: "var(--card-bg)", borderRight: "1px solid rgba(70, 211, 126, 0.2)",
  padding: "40px 20px", zIndex: 100, overflowY: "auto"
};

const logoStyle = { color: "var(--neon)", fontWeight: "800", fontSize: "24px", marginBottom: "40px", textAlign: "center" };
const navStyle = { display: "flex", flexDirection: "column", gap: "10px" };

const linkStyle = {
  color: "var(--text)", textDecoration: "none", padding: "12px",
  borderRadius: "12px", transition: "all 0.3s"
};

const activeLinkStyle = {
  ...linkStyle, background: "rgba(70, 211, 126, 0.15)",
  color: "var(--neon)", fontWeight: "bold"
};

const folderToggleStyle = {
  ...linkStyle, cursor: "pointer", userSelect: "none"
};

const folderListStyle = {
  display: "flex", flexDirection: "column", gap: "5px", marginLeft: "15px",
  borderLeft: "2px solid rgba(70, 211, 126, 0.2)", paddingLeft: "10px", marginTop: "-5px"
};

const subLinkStyle = {
  color: "var(--text)", textDecoration: "none", padding: "8px 12px",
  borderRadius: "8px", fontSize: "0.9rem", transition: "all 0.2s", opacity: 0.8
};

const activeSubLinkStyle = {
  ...subLinkStyle, background: "rgba(70, 211, 126, 0.1)",
  color: "var(--neon)", fontWeight: "bold", opacity: 1
};