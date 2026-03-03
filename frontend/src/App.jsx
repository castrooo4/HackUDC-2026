import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { listInbox, createInboxItem, getInboxItem, deleteInboxItem, updateInboxItem } from "./api/inbox";
import { logout } from "./api/auth";
import TopBar from "./components/TopBar.jsx";
import CardGrid from "./components/CardGrid";
import InboxDetailModal from "./components/InboxDetailModal";
import CreateItemModal from "./components/CreateItemModal";
import InboxFilters from "./components/InboxFilters.jsx";
import LoginForm from "./components/LoginForm.jsx";
import Sidebar from "./components/Sidebar";
import Novedades from "./views/Novedades";
import PrioridadView from "./views/PrioridadView";
import CarpetaView from "./views/CarpetaView";
import MapaView from "./views/MapaView";
import CiudadesView from "./views/CiudadesView";
import MergeView from "./views/MergeView";
import { filterAndSortInboxItems } from "./utils/inboxFilters";
import MobileNav from "./components/MobileNav.jsx";

export default function App() {
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const [filterType, setFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token"));

  const filteredAndSortedItems = useMemo(() => {
    return filterAndSortInboxItems(items, filterType, searchQuery);
  }, [items, filterType, searchQuery]);

  useEffect(() => {
    if (!token) return;

    refreshList();

    const handleSync = (event) => {
      if (event.data?.type === "REMIT_NEW_ITEM") {
        refreshList();
      }
    };

    window.addEventListener("message", handleSync);
    return () => window.removeEventListener("message", handleSync);
  }, [token]);

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
      alert(error?.message || "No se pudo crear el elemento");
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

  async function handleDeleteItem(id) {
    if (!window.confirm("¿Eliminar este elemento del inbox?")) return;
    try {
      await deleteInboxItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      window.postMessage({ type: "REMIT_WEB_TOAST", message: "Elemento eliminado", toastType: "success" }, "*");
    } catch (error) {
      alert(error?.message || "No se pudo eliminar el elemento");
    }
  }

  async function handleTogglePin(item) {
    const newPinnedState = !item.is_pinned;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_pinned: newPinnedState } : i))
    );

    try {
      await updateInboxItem(item.id, { is_pinned: newPinnedState });
    } catch (error) {
      console.error("Error al anclar:", error);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_pinned: !newPinnedState } : i))
      );
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
            <TopBar onLogout={handleLogout} />

            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <InboxFilters
                      filterType={filterType}
                      onFilterTypeChange={setFilterType}
                      searchQuery={searchQuery}
                      onSearchQueryChange={setSearchQuery}
                    />

                    {loadingList ? (
                      <div className="loading">Sincronizando...</div>
                    ) : (
                      <CardGrid
                        items={filteredAndSortedItems}
                        setItems={setItems}
                        onOpen={openDetail}
                        onDelete={handleDeleteItem}
                        onPin={handleTogglePin}
                      />
                    )}
                  </>
                }
              />
              <Route path="/novedades" element={<Novedades onOpenDetail={openDetail} />} />
              <Route path="/prioridad" element={<PrioridadView onOpenDetail={openDetail} />} />
              <Route path="/carpeta/:id" element={<CarpetaView onOpenDetail={openDetail} onDeleteItem={handleDeleteItem} />} />
              <Route path="/mapa" element={<MapaView items={items} onOpenDetail={openDetail} />} />
              <Route path="/ciudades" element={<CiudadesView onOpenDetail={openDetail} onDeleteItem={handleDeleteItem} />} />
              <Route path="/merge" element={<MergeView onOpenDetail={openDetail} />} />
            </Routes>
          </div>
        </div>

        <button onClick={() => setCreateOpen(true)} style={fabStyle}>+</button>

        <div className="mobile-only">
          <MobileNav />
        </div>

        <CreateItemModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />

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
