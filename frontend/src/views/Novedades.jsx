// src/views/Novedades.jsx
import React, { useState, useEffect } from 'react';
import { getPendingInbox, getDirectoriesTree, confirmOrganization } from '../api/inbox';

export default function Novedades({ onOpenDetail }) {
  const [pendingItems, setPendingItems] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [itemsData, dirsData] = await Promise.all([
        getPendingInbox(),
        getDirectoriesTree()
      ]);

      // Aseguramos que sea un array
      setPendingItems(Array.isArray(itemsData) ? itemsData : []);

      // CLAVE: El JSON del backend trae las carpetas dentro de la propiedad "roots"
      setDirectories(dirsData?.roots || []);

    } catch (err) {
      setError(err.message || "Error al cargar las novedades");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(itemId, option) {
    try {
      await confirmOrganization(itemId, option);
      // Eliminamos la tarjeta visualmente con un efecto instantáneo
      setPendingItems(prev => prev.filter(item => item.id !== itemId));
      setNewFolderName("");
    } catch (err) {
      alert("Error al organizar: " + err.message);
      if (err.message.includes("409")) fetchData(); // Si hubo conflicto, recargamos
    }
  }

  const getSuggestedName = (dirId) => {
    if (!dirId) return "la IA";

    let foundName = null;
    const searchFolder = (folders) => {
      for (const folder of folders) {
        if (folder.id === dirId) foundName = folder.name;
        if (!foundName && folder.children && folder.children.length > 0 && typeof folder.children[0] === 'object') {
          searchFolder(folder.children);
        }
      }
    };
    searchFolder(directories);

    return foundName || `Carpeta ${dirId}`;
  };

  if (loading) return <div style={containerStyle}><div style={loadingStyle}>Sincronizando con la IA...</div></div>;
  if (error) return <div style={containerStyle}><p style={{ color: '#ff4444', padding: '20px', background: 'rgba(255,0,0,0.1)', borderRadius: '16px' }}>❌ {error}</p></div>;

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--neon)' }}>✨ BANDEJA DE CLASIFICACIÓN</h2>
        <div style={badgeStyle}>{pendingItems.length} pendientes</div>
      </div>

      <p style={{ opacity: 0.7, marginBottom: '30px' }}>
        La IA ha procesado estos elementos. Confirma dónde quieres guardarlos para que pasen a tu Inbox principal.
      </p>

      {pendingItems.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎉</div>
          <h3 style={{ margin: 0, color: 'var(--neon)' }}>¡Todo al día!</h3>
          <p style={{ opacity: 0.7 }}>No hay elementos pendientes de validación humana.</p>
        </div>
      ) : (
        <div style={gridStyle}>
          {pendingItems.map(item => (
            <div key={item.id} style={cardNovedadStyle}>

              {/* ZONA SUPERIOR: Info y Preview */}
              <div
                style={{ ...itemHeaderStyle, cursor: 'pointer' }}
                onClick={() => onOpenDetail(item.id)}
                title="Haz clic para ver todos los detalles"
              >
                <div style={{ flex: 1 }}>
                  <div style={sourceStyle}>{item.item_type} • {item.source}</div>
                  <h3 style={{ margin: '5px 0 10px 0', color: 'white', fontSize: '1.3rem' }}>
                    {item.title || `Elemento #${item.id}`}
                  </h3>

                  {/* Pintamos content o URL como resumen */}
                  {item.content && (
                    <p style={contentStyle}>{item.content}</p>
                  )}
                </div>

                {/* Si hay imagen, la mostramos */}
                {item.preview_base64 && (
                  <img
                    src={item.preview_base64.startsWith('data:') ? item.preview_base64 : `data:image/jpeg;base64,${item.preview_base64}`}
                    alt="Preview"
                    style={previewImageStyle}
                  />
                )}
              </div>

              {/* ZONA INFERIOR: Botonera de decisión */}
              <div style={actionSectionStyle}>
                {/* 1. Aceptar Sugerencia (La opción rápida) */}

                <button
                  style={btnSuggestStyle}
                  onClick={() => handleConfirm(item.id, { type: 'RECOMMENDED' })}
                >
                  ✨ Aceptar sugerencia: <b>{getSuggestedName(item.directory_id)}</b>
                </button>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {/* 2. Seleccionar existente */}
                  <select
                    style={selectStyle}
                    onChange={(e) => {
                      if (e.target.value) handleConfirm(item.id, { type: 'EXISTING', id: parseInt(e.target.value) });
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>📂 Mover a carpeta existente...</option>
                    {directories.map(dir => (
                      <option key={dir.id} value={dir.id}>{dir.name || `Carpeta ${dir.id}`}</option>
                    ))}
                  </select>

                  {/* 3. Crear Nueva */}
                  <div style={{ display: 'flex', flex: 1, minWidth: '200px' }}>
                    <input
                      type="text"
                      placeholder="Crear nueva carpeta... (Enter)"
                      style={inputStyle}
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          handleConfirm(item.id, { type: 'NEW', name: newFolderName.trim() });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- ESTILOS ---
const containerStyle = { padding: '10px 0', color: 'var(--text)' };
const loadingStyle = { padding: '40px', textAlign: 'center', opacity: 0.7, fontSize: '1.2rem', background: 'var(--card-bg)', borderRadius: '26px' };
const emptyStyle = { padding: '60px 20px', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '26px', border: '1px solid rgba(70, 211, 126, 0.2)' };
const gridStyle = { display: 'flex', flexDirection: 'column', gap: '25px' };

const badgeStyle = { background: 'rgba(70, 211, 126, 0.2)', color: 'var(--neon)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid rgba(70, 211, 126, 0.4)' };

const cardNovedadStyle = {
  background: 'var(--card-bg)',
  border: '2px solid rgba(70, 211, 126, 0.3)',
  padding: '25px',
  borderRadius: '26px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
  transition: 'transform 0.2s ease',
};

const itemHeaderStyle = { display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'flex-start' };
const sourceStyle = { color: 'var(--neon)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.8 };
const contentStyle = { opacity: 0.7, fontSize: '0.95rem', lineHeight: '1.5', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

const previewImageStyle = {
  width: '140px',
  height: '100px',
  objectFit: 'cover',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  flexShrink: 0
};

const actionSectionStyle = {
  borderTop: '1px dashed rgba(70, 211, 126, 0.3)',
  paddingTop: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const btnSuggestStyle = {
  width: '100%', background: 'rgba(70, 211, 126, 0.15)', color: 'var(--neon)',
  border: '1px solid var(--neon)', padding: '14px', borderRadius: '12px',
  cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s'
};

const selectStyle = {
  flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)',
  color: 'white', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', cursor: 'pointer'
};

const inputStyle = {
  width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)',
  color: 'white', border: '1px solid rgba(255,255,255,0.1)', outline: 'none'
};