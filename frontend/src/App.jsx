import React, { useEffect, useState } from "react";
import { health, listInbox, createInboxItem, getInboxItem } from "./api/inbox";
import TopBar from "./components/TopBar.jsx";
import NewInboxItemForm from "./components/NewInboxItemForm.jsx";
import CardGrid from "./components/CardGrid";
import InboxDetailModal from "./components/InboxDetailModal";
import CreateItemModal from "./components/CreateItemModal";
import ThemeSlider from "./components/ThemeSlider";

export default function App() {
  const [healthOk, setHealthOk] = useState(false);
  const [items, setItems] = useState([]);

  // src/App.jsx (Temporal para ver el diseño)
  /*const [items, setItems] = useState([
  { id: 1, title: "", content: "Crear una red social para mascotas", source: "Brainstorm" },
  { id: 2, title: "Recordatorio", content: "Comprar leche y pan al salir del trabajo", source: "Tareas" },
  { id: 3, title: "Proyecto React", content: "Terminar los estilos del Grid neón", source: "Dev" },
  { id: 4, title: "Cita Médica", content: "Lunes a las 10:00 AM en el centro", source: "Salud" },
  { id: 5, title: "Lectura", content: "Terminar el libro de Clean Code", source: "Libros" },
  { id: 6, title: "Gimnasio", content: "Entrenamiento de pierna hoy", source: "Fitness" }
]);*/
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);

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

  useEffect(() => {
    refreshHealth();
    refreshList();
  }, []);

  /*
  async function handleCreate(payload) {
    await createInboxItem(payload);
    await refreshList();
  }
    */

  //Prueba
  async function handleCreate(payload) {
  try {
    const newItem = await createInboxItem(payload);
    // Añadimos el nuevo ítem al final de la lista actual (...prev, newItem)
    setItems(prev => [...prev, newItem]); 
  } catch (e) {
    // Si la API falla pero quieres verlo abajo en modo prueba:
    const mockItem = { id: Date.now(), ...payload };
    setItems(prev => [...prev, mockItem]);
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

  return (
    <div className={`app ${isLight ? "light-mode" : ""}`}>
      <div className="bg" />
      <div className="container">
        <TopBar 
          healthOk={healthOk} 
          total={items.length} 
          rightContent={
            <ThemeSlider isLight={isLight} onToggle={() => setIsLight(!isLight)} />
          }
        />
        {/* El formulario ya no está aquí  */}

        {listError ? <div className="error">{listError}</div> : null}
        {loadingList ? (
          <div className="loading">Cargando…</div>
        ) : (
          <CardGrid items={items} setItems={setItems} onOpen={openDetail} />
        )}
      </div>

      {/* Botón Flotante + */}
      <button onClick={() => setCreateOpen(true)} style={fabStyle}>+</button>

      {/* Modal de Creación */}
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

  /*
  return (
    <div className="app">
      <div className="bg" />
      <div className="container">
        <TopBar healthOk={healthOk} total={items.length} />
        <NewInboxItemForm onCreate={handleCreate} />

        {listError ? <div className="error">{listError}</div> : null}
        {loadingList ? <div className="loading">Cargando…</div> : <CardGrid items={items} setItems={setItems} onOpen={openDetail} />}
      </div>

      <InboxDetailModal
        open={detailOpen}
        item={detailItem}
        loading={detailLoading}
        error={detailError}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}*/