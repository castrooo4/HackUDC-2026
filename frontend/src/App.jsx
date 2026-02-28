import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { health, listInbox, createInboxItem, getInboxItem } from "./api/inbox";
import { logout } from "./api/auth";
import TopBar from "./components/TopBar.jsx";
import CardGrid from "./components/CardGrid";
import InboxDetailModal from "./components/InboxDetailModal";
import CreateItemModal from "./components/CreateItemModal";
import LoginForm from "./components/LoginForm.jsx";
import Sidebar from "./components/Sidebar";
import Novedades from "./views/Novedades";
import CarpetaView from "./views/CarpetaView";
import MapaView from "./views/MapaView";
import CiudadesView from "./views/CiudadesView";

export default function App() {
  const [healthOk, setHealthOk] = useState(false);
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (!token) return;

    refreshHealth();
    refreshList();

    const handleSync = (event) => {
      if (event.data?.type === "REMIT_NEW_ITEM") {
        refreshList();
      }
    };

    window.addEventListener("message", handleSync);
    return () => window.removeEventListener("message", handleSync);
  }, [token]);

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
    try {
      const data = await listInbox();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoadingList(false);
    }
  }

  const handleLoginSuccess = () => {
    setToken(localStorage.getItem("token"));
  };

  const handleLogout = () => {
    logout();
    setToken(null);
    setItems([]);
  };

  async function handleCreate(payload) {
    try {
      const newItem = await createInboxItem(payload);
      setItems((prev) => [newItem, ...prev]);
    } catch (error) {
      console.error("Error al crear:", error);
      const mockItem = { id: Date.now(), ...payload, status: "PENDING", created_at: new Date().toISOString() };
      setItems((prev) => [mockItem, ...prev]);
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
    } catch (error) {
      setDetailError(error?.message ?? "Error cargando detalle");
    } finally {
      setDetailLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="app">
        <div className="bg" />
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <Router>
      <div className="app" style={{ display: "flex" }}>
        <Sidebar />

        <div className="main-content" style={{ flex: 1, marginLeft: "240px" }}>
          <div className="bg" />
          <div className="container">
            <TopBar healthOk={healthOk} total={items.length} onLogout={handleLogout} />

            <Routes>
              <Route
                path="/"
                element={
                  loadingList ? (
                    <div className="loading">Sincronizando cerebro digital...</div>
                  ) : (
                    <CardGrid items={items} setItems={setItems} onOpen={openDetail} />
                  )
                }
              />
              <Route path="/novedades" element={<Novedades onOpenDetail={openDetail} />} />
              <Route path="/carpeta/:id" element={<CarpetaView onOpenDetail={openDetail} />} />
              <Route path="/mapa" element={<MapaView items={items} onOpenDetail={openDetail} />} />
              <Route path="/ciudades" element={<CiudadesView onOpenDetail={openDetail} />} />
            </Routes>
          </div>
        </div>

        <button onClick={() => setCreateOpen(true)} style={fabStyle}>+</button>

        <CreateItemModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />

        <InboxDetailModal
          open={detailOpen}
          item={detailItem}
          loading={detailLoading}
          error={detailError}
          onClose={() => setDetailOpen(false)}
        />
      </div>
    </Router>
  );
}

const fabStyle = {
  position: "fixed",
  bottom: 30,
  right: 30,
  width: 60,
  height: 60,
  borderRadius: "50%",
  background: "#46d37e",
  color: "#0b0f0d",
  fontSize: 32,
  fontWeight: "bold",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 0 20px rgba(70,211,126,0.4)",
  zIndex: 1000,
  transition: "transform 0.2s",
};
