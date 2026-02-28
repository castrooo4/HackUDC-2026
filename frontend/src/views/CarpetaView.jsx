// src/views/CarpetaView.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getOrganizedInbox, getDirectoriesTree } from '../api/inbox';
import CardGrid from '../components/CardGrid';
import { Folder } from 'lucide-react';

export default function CarpetaView({ onOpenDetail }) {
  // Extraemos el ID de la carpeta desde la URL de React Router
  const { id } = useParams();
  const folderId = parseInt(id);

  const [items, setItems] = useState([]);
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [dirsData, itemsData] = await Promise.all([
          getDirectoriesTree(),
          getOrganizedInbox()
        ]);

        // Buscamos el nombre de la carpeta actual en el árbol
        let foundName = `Carpeta ${folderId}`;
        const searchFolder = (folders) => {
          for (const f of folders) {
            if (f.id === folderId) foundName = f.name;
            if (f.children && f.children.length > 0 && typeof f.children[0] === 'object') {
              searchFolder(f.children);
            }
          }
        };
        searchFolder(dirsData?.roots || []);
        setFolderName(foundName);

        // Filtramos las notas para quedarnos SOLO con las de esta carpeta
        const allOrganized = Array.isArray(itemsData) ? itemsData : [];
        setItems(allOrganized.filter(item => item.directory_id === folderId));

      } catch (err) {
        console.error("Error cargando la carpeta:", err);
      } finally {
        setLoading(false);
      }
    }

    // El useEffect se vuelve a ejecutar cada vez que cambia el ID en la URL
    loadData();

    const handleSync = (event) => {
      if (event.data?.type === "REMIT_NEW_ITEM") {
        console.log("Magia: Recargando la carpeta en segundo plano...");
        loadData();
      }
    };
    window.addEventListener("message", handleSync);
    return () => window.removeEventListener("message", handleSync);
  }, [folderId]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', opacity: 0.7 }}>Abriendo carpeta...</div>;
  }

  return (
    <div style={{ padding: '10px 0', color: 'var(--text)' }}>
      {/* 2. Sustituimos el emoticono por el componente Folder */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
        <h2 style={{ 
          margin: 0, 
          color: 'var(--neon)', 
          fontSize: '2rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px' 
        }}>
          <Folder size={32} strokeWidth={2.5} /> {folderName}
        </h2>
        <div style={badgeStyle}>{items.length} elementos</div>
      </div>

      {items.length === 0 ? (
        <div style={emptyStyle}>
          {/* 3. También podemos mejorar el icono del estado vacío */}
          <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
            <Folder size={48} style={{ opacity: 0.2, color: 'var(--neon)' }} />
          </div>
          <h3 style={{ margin: 0, color: 'var(--neon)' }}>Carpeta vacía</h3>
          <p style={{ opacity: 0.7 }}>Aún no has organizado nada aquí.</p>
        </div>
      ) : (
        <CardGrid items={items} setItems={() => { }} onOpen={onOpenDetail} />
      )}
    </div>
  );
}

// --- ESTILOS ---
const badgeStyle = {
  background: 'rgba(70, 211, 126, 0.2)', color: 'var(--neon)',
  padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold'
};

const emptyStyle = {
  padding: '60px 20px', textAlign: 'center', background: 'var(--card-bg)',
  borderRadius: '26px', border: '1px dashed rgba(70, 211, 126, 0.3)'
};