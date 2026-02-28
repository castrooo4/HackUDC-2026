import { useEffect, useMemo, useState } from "react";
import { createTelegramLinkCode, getTelegramLinkStatus } from "../api/telegram";

export default function TelegramLinkModal({ open, onClose }) {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");

  const [codeData, setCodeData] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [copyMsg, setCopyMsg] = useState("");

  const botUsername = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "").trim();

  const startCommand = useMemo(() => {
    if (!codeData?.code) return "";
    return `/start ${codeData.code}`;
  }, [codeData]);

  const ttlLabel = useMemo(() => {
    if (!Number.isFinite(codeData?.ttl_seconds)) return "";
    const total = Math.max(0, Number(codeData.ttl_seconds));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}m ${seconds}s`;
  }, [codeData]);

  const botLink = useMemo(() => {
    if (!botUsername || !codeData?.code) return "";
    return `https://t.me/${botUsername}?start=${encodeURIComponent(codeData.code)}`;
  }, [botUsername, codeData]);

  useEffect(() => {
    if (!open) return;
    fetchStatus();
  }, [open]);

  async function fetchStatus() {
    setStatusLoading(true);
    setStatusError("");
    try {
      const data = await getTelegramLinkStatus();
      setStatus(data);
    } catch (err) {
      setStatusError(err?.message || "No se pudo consultar el estado de Telegram");
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleCreateCode() {
    setCodeLoading(true);
    setCodeError("");
    setCopyMsg("");
    try {
      const data = await createTelegramLinkCode();
      setCodeData(data);
    } catch (err) {
      setCodeError(err?.message || "No se pudo generar el codigo");
    } finally {
      setCodeLoading(false);
    }
  }

  async function copyText(value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyMsg("Copiado");
    } catch {
      setCopyMsg("No se pudo copiar");
    }
  }

  if (!open) return null;

  return (
    <div onMouseDown={onClose} style={backdropStyle}>
      <div onMouseDown={(e) => e.stopPropagation()} style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <b style={{ color: "rgba(70,211,126,.95)" }}>Vincular Telegram</b>
            <div style={subtitleStyle}>Guarda notas enviando mensajes o imagenes a tu bot.</div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>Estado</div>
          {statusLoading ? (
            <div style={mutedTextStyle}>Cargando estado...</div>
          ) : statusError ? (
            <div style={errorStyle}>{statusError}</div>
          ) : status?.linked ? (
            <div style={okStyle}>
              Vinculado. Chat ID: <code>{status.telegram_chat_id}</code>
            </div>
          ) : (
            <div style={mutedTextStyle}>No vinculado todavia.</div>
          )}
          <button onClick={fetchStatus} style={secondaryBtnStyle}>
            Actualizar estado
          </button>
        </section>

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>Paso 1: Generar codigo</div>
          <button onClick={handleCreateCode} disabled={codeLoading} style={primaryBtnStyle}>
            {codeLoading ? "Generando..." : "Generar codigo"}
          </button>
          {codeError && <div style={errorStyle}>{codeError}</div>}
          {codeData?.code && (
            <div style={codeBoxStyle}>
              <div style={codeTextStyle}>{codeData.code}</div>
              {ttlLabel && (
                <div style={mutedTextStyle}>Expira en: {ttlLabel}</div>
              )}
              <button onClick={() => copyText(startCommand)} style={secondaryBtnStyle}>
                Copiar comando /start
              </button>
            </div>
          )}
          {copyMsg && <div style={mutedTextStyle}>{copyMsg}</div>}
        </section>

        {codeData?.code && (
          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>Paso 2: Enviar al bot</div>
            <div style={instructionStyle}>
              Envia este comando al bot en chat privado:
              <div style={commandStyle}>{startCommand}</div>
            </div>
            {botLink ? (
              <a href={botLink} target="_blank" rel="noreferrer" style={linkStyle}>
                Abrir bot con codigo
              </a>
            ) : (
              <div style={mutedTextStyle}>
                Opcional: configura <code>VITE_TELEGRAM_BOT_USERNAME</code> para abrir enlace directo al bot.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100001,
  backdropFilter: "blur(5px)",
};

const modalStyle = {
  width: "min(560px, 92%)",
  borderRadius: 22,
  border: "2px solid rgba(70,211,126,.45)",
  background: "rgba(10,16,12, 0.98)",
  padding: 22,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
};

const subtitleStyle = {
  marginTop: 4,
  opacity: 0.75,
  fontSize: 13,
};

const closeBtnStyle = {
  background: "none",
  border: "none",
  color: "white",
  cursor: "pointer",
  fontSize: 18,
};

const sectionStyle = {
  border: "1px solid rgba(70,211,126,.2)",
  borderRadius: 14,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const sectionTitleStyle = {
  fontWeight: 700,
  fontSize: 14,
};

const mutedTextStyle = {
  opacity: 0.75,
  fontSize: 13,
};

const errorStyle = {
  border: "1px solid rgba(255,90,90,.45)",
  borderRadius: 10,
  background: "rgba(255,90,90,.12)",
  color: "#ff9393",
  fontSize: 13,
  padding: "8px 10px",
};

const okStyle = {
  border: "1px solid rgba(70,211,126,.45)",
  borderRadius: 10,
  background: "rgba(70,211,126,.12)",
  color: "#8af0b4",
  fontSize: 13,
  padding: "8px 10px",
};

const primaryBtnStyle = {
  borderRadius: 10,
  border: "1px solid rgba(70,211,126,.35)",
  background: "#46d37e",
  color: "#0b0f0d",
  padding: "10px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtnStyle = {
  borderRadius: 10,
  border: "1px solid rgba(70,211,126,.28)",
  background: "rgba(20,30,24,.65)",
  color: "var(--text)",
  padding: "8px 10px",
  fontWeight: 600,
  cursor: "pointer",
  width: "fit-content",
};

const codeBoxStyle = {
  borderRadius: 12,
  border: "1px dashed rgba(70,211,126,.45)",
  background: "rgba(8,14,10,.8)",
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const codeTextStyle = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 16,
  fontWeight: 700,
};

const instructionStyle = {
  fontSize: 13,
  opacity: 0.9,
};

const commandStyle = {
  marginTop: 8,
  padding: "8px 10px",
  borderRadius: 10,
  background: "rgba(20,30,24,.6)",
  border: "1px solid rgba(70,211,126,.25)",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const linkStyle = {
  color: "var(--neon)",
  textDecoration: "underline",
  fontWeight: 700,
  fontSize: 13,
  width: "fit-content",
};
