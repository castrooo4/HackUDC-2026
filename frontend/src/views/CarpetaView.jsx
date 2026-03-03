import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Folder } from "lucide-react";

import { listOrganizedInbox, getDirectoriesTree, updateInboxItem } from "../api/inbox";
import CardGrid from "../components/CardGrid";
import InboxFilters from "../components/InboxFilters";
import { filterAndSortInboxItems } from "../utils/inboxFilters";

export default function CarpetaView({ onOpenDetail, onDeleteItem }) {
  const { id } = useParams();
  const folderId = Number.parseInt(id, 10);

  const [items, setItems] = useState([]);
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndSortedItems = useMemo(() => {
    return filterAndSortInboxItems(items, filterType, searchQuery);
  }, [items, filterType, searchQuery]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [dirsData, itemsData] = await Promise.all([getDirectoriesTree(), listOrganizedInbox()]);

        let foundName = `Carpeta ${folderId}`;
        const searchFolder = (folders) => {
          for (const folder of folders) {
            if (folder.id === folderId) foundName = folder.name;
            if (folder.children && folder.children.length > 0 && typeof folder.children[0] === "object") {
              searchFolder(folder.children);
            }
          }
        };
        searchFolder(dirsData?.roots || []);
        setFolderName(foundName);

        const allOrganized = Array.isArray(itemsData) ? itemsData : [];
        setItems(allOrganized.filter((item) => item.directory_id === folderId));
      } catch (error) {
        console.error("Error cargando la carpeta:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    const handleSync = (event) => {
      if (event.data?.type === "REMIT_NEW_ITEM") {
        loadData();
      }
    };

    window.addEventListener("message", handleSync);
    return () => window.removeEventListener("message", handleSync);
  }, [folderId]);

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
      alert("No se pudo guardar el anclaje");
    }
  }

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", opacity: 0.7 }}>Abriendo carpeta...</div>;
  }

  return (
    <div style={{ padding: "10px 0", color: "var(--text)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "25px" }}>
        <h2
          style={{
            margin: 0,
            color: "var(--neon)",
            fontSize: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Folder size={32} strokeWidth={2.5} /> {folderName}
        </h2>
        <div style={badgeStyle}>{items.length} elementos</div>
      </div>

      <InboxFilters
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      {items.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ marginBottom: "15px", display: "flex", justifyContent: "center" }}>
            <Folder size={48} style={{ opacity: 0.2, color: "var(--neon)" }} />
          </div>
          <h3 style={{ margin: 0, color: "var(--neon)" }}>Carpeta vacia</h3>
          <p style={{ opacity: 0.7 }}>Aun no has organizado nada aqui.</p>
        </div>
      ) : filteredAndSortedItems.length === 0 ? (
        <div style={emptyStyle}>
          <h3 style={{ margin: 0, color: "var(--neon)" }}>Sin resultados</h3>
          <p style={{ opacity: 0.7 }}>Ajusta el buscador o el tipo para ver elementos.</p>
        </div>
      ) : (
        <CardGrid items={filteredAndSortedItems} setItems={setItems} onOpen={onOpenDetail} onDelete={onDeleteItem} onPin={handleTogglePin} />
      )}
    </div>
  );
}

const badgeStyle = {
  background: "rgba(70, 211, 126, 0.2)",
  color: "var(--neon)",
  padding: "5px 12px",
  borderRadius: "20px",
  fontSize: "0.85rem",
  fontWeight: "bold",
};

const emptyStyle = {
  padding: "60px 20px",
  textAlign: "center",
  background: "var(--card-bg)",
  borderRadius: "26px",
  border: "1px dashed rgba(70, 211, 126, 0.3)",
};
