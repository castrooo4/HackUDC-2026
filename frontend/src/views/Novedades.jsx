// src/views/Novedades.jsx
import React from 'react';

export default function Novedades() {
  return (
    <div style={{ padding: '20px', color: 'var(--text)' }}>
      <h2 style={{ color: 'var(--neon)' }}>✨ NOVEDADES DEL SISTEMA</h2>
      <div style={cardNovedadStyle}>
        <h3>Versión 1.1 - Mejoras Visuales</h3>
        <p>Hemos actualizado el diseño del Inbox para incluir previsualizaciones de imágenes.</p>
        <small style={{ opacity: 0.6 }}>Publicado el 25 de Octubre, 2023</small>
      </div>
    </div>
  );
}

const cardNovedadStyle = {
  background: 'var(--card-bg)',
  border: '1px solid rgba(70, 211, 126, 0.2)',
  padding: '20px',
  borderRadius: '16px',
  marginTop: '20px'
};