import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Folder } from "lucide-react";

import { getOrganizedInbox, getDirectoriesTree } from "../api/inbox";
import CardGrid from "../components/CardGrid";

export default function CarpetaView({ onOpenDetail }) {
  const { id } = useParams();
  const folderId = Number.parseInt(id, 10);

  const [items, setItems] = useState([]);
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [dirsData, itemsData] = await Promise.all([getDirectoriesTree(), getOrganizedInbox()]);

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

      {items.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ marginBottom: "15px", display: "flex", justifyContent: "center" }}>
            <Folder size={48} style={{ opacity: 0.2, color: "var(--neon)" }} />
          </div>
          <h3 style={{ margin: 0, color: "var(--neon)" }}>Carpeta vacia</h3>
          <p style={{ opacity: 0.7 }}>Aun no has organizado nada aqui.</p>
        </div>
      ) : (
        <CardGrid items={items} setItems={setItems} onOpen={onOpenDetail} />
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
