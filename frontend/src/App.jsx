import React, { useEffect, useState } from "react";
import { health, listInbox, createInboxItem, getInboxItem } from "./api/inbox";
import { logout } from "./api/auth"; // Importamos la función de limpieza
import TopBar from "./components/TopBar.jsx";
import CardGrid from "./components/CardGrid";
import InboxDetailModal from "./components/InboxDetailModal";
import CreateItemModal from "./components/CreateItemModal";
import ThemeSlider from "./components/ThemeSlider";
import LoginForm from "./components/LoginForm.jsx";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Novedades from "./views/Novedades";
import CarpetaView from "./views/CarpetaView";

export default function App() {
  const [healthOk, setHealthOk] = useState(false);
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);

  // Estado de autenticación
  const [token, setToken] = useState(localStorage.getItem("token"));

  // 1. Efecto para cargar datos solo cuando hay token
  useEffect(() => {
    if (token) {
      refreshHealth();
      refreshList();
    }
  }, [token]);

  // Funciones de API
  async function refreshHealth() {
    try {
      const res = await health();
      setHealthOk(Boolean(res?.ok));
    } catch {
      setHealthOk(false);
    }
  }

  async function refreshList() {
    setLoadingList(true);
    setListError("");
    try {
      const data = await listInbox();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setListError(e?.message ?? "Error cargando inbox");
    } finally {
      setLoadingList(false);
    }
  }

  // Lógica de sesión
  const handleLoginSuccess = () => {
    setToken(localStorage.getItem("token"));
  };

  const handleLogout = () => {
    logout(); // Borra localStorage
    setToken(null); // Vuelve al estado de Login
    setItems([]); // Limpia datos de la vista por seguridad
  };

  async function handleCreate(payload) {
    try {
      const newItem = await createInboxItem(payload);
      setItems(prev => [newItem, ...prev]);
    } catch (e) {
      console.error("Error al crear:", e);
      // Opcional: Mock en caso de error de red para pruebas visuales
      const mockItem = { id: Date.now(), ...payload, status: "PENDING", created_at: new Date().toISOString() };
      setItems(prev => [mockItem, ...prev]);
    }
  }

  async function openDetail(id) {
    setDetailOpen(true);
    setDetailItem(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const data = await getInboxItem(id);
      setDetailItem(data);
    } catch (e) {
      setDetailError(e?.message ?? "Error cargando detalle");
    } finally {
      setDetailLoading(false);
    }
  }

  // RENDER CONDICIONAL: Login
  if (!token) {
    return (
      <div className={`app ${isLight ? "light-mode" : ""}`}>
        <div className="bg" />
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // RENDER: App Principal
  return (
    <Router>
      <div className={`app ${isLight ? "light-mode" : ""}`} style={{ display: "flex" }}>
        <Sidebar />

        {/* Añadimos un margen izquierdo para que el contenido no quede debajo del Sidebar */}
        <div className="main-content" style={{ flex: 1, marginLeft: "240px" }}>
          <div className="bg" />
          <div className="container">
            <TopBar healthOk={healthOk} total={items.length} onLogout={handleLogout} />

            <Routes>
              {/* Esta es tu pantalla principal actual */}
              <Route path="/" element={
                loadingList ? (
                  <div className="loading">Sincronizando cerebro digital...</div>
                ) : (
                  <CardGrid items={items} setItems={setItems} onOpen={openDetail} />
                )
              } />

              {/* Esta es la nueva pestaña */}
              <Route path="/novedades" element={<Novedades />} />

              <Route path="/carpeta/:id" element={<CarpetaView onOpenDetail={openDetail} />} />
            </Routes>
          </div>
        </div>

        {/* El botón flotante y modales se mantienen globales */}
        <button onClick={() => setCreateOpen(true)} style={fabStyle}>+</button>
        <CreateItemModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
        {/* ... resto de modales */}
      </div>
    </Router>
  );
}

const fabStyle = {
  position: "fixed", bottom: 30, right: 30,
  width: 60, height: 60, borderRadius: "50%",
  background: "#46d37e", color: "#0b0f0d",
  fontSize: 32, fontWeight: "bold", border: "none",
  cursor: "pointer", boxShadow: "0 0 20px rgba(70,211,126,0.4)",
  zIndex: 1000, transition: "transform 0.2s"
};