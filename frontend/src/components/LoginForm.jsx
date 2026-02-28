import React, { useState } from "react";
import { login, register as registerApi } from "../api/auth";
import logoImg from "../assets/remit-logo.png";

export default function LoginForm({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false); // Estado para alternar modo
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // Nuevo campo para registro
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isRegister) {
        // Lógica de Registro
        await registerApi(username, email, password);
        setSuccess("¡Cuenta creada! Ya puedes iniciar sesión.");
        setIsRegister(false); // Volvemos al login tras registrarse
      } else {
        // Lógica de Login
        await login(username, password);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={loginContainerStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={{ textAlign: "center", marginBottom: "5px" }}> {/* Reducido de 40px a 10px */}
          <img src={logoImg} alt="Logo" style={{ width: "100px", height: "auto" }} />
        </div>
        <h2 style={{ color: "var(--neon)", textAlign: "center", marginBottom: '5px' }}>
          {isRegister ? "RemIt - Registro" : "RemIt - Inicio de Sesión"}
        </h2>
        <p style={{ textAlign: "center", opacity: 0.7, marginBottom: '20px' }}>
          {isRegister ? "Crea tu cuenta de acceso" : "Identifícate para acceder"}
        </p>
        
        {error && <div className="error-msg" style={errorStyle}>{error}</div>}
        {success && <div className="success-msg" style={successStyle}>{success}</div>}

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
          required
        />

        {isRegister && (
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
        )}

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          required
        />
        
        <button disabled={loading} style={loginBtnStyle}>
          {loading ? "PROCESANDO..." : isRegister ? "CREAR CUENTA" : "ENTRAR"}
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
          <span style={{ opacity: 0.6 }}>
            {isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}
          </span>
          <button 
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            style={toggleBtnStyle}
          >
            {isRegister ? "Inicia Sesión" : "Regístrate aquí"}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Estilos adicionales ---
const errorStyle = {
  background: "rgba(255, 0, 0, 0.2)",
  color: "#ff4444",
  padding: "10px",
  borderRadius: "8px",
  marginBottom: "15px",
  fontSize: "0.85rem",
  border: "1px solid #ff4444"
};

const successStyle = {
  background: "rgba(70, 211, 126, 0.2)",
  color: "var(--neon)",
  padding: "10px",
  borderRadius: "8px",
  marginBottom: "15px",
  fontSize: "0.85rem",
  border: "1px solid var(--neon)"
};

const toggleBtnStyle = {
  background: "none",
  border: "none",
  color: "var(--neon)",
  cursor: "pointer",
  fontWeight: "bold",
  marginLeft: "5px",
  textDecoration: "underline"
};

const loginContainerStyle = {
  display: "flex", justifyContent: "center", alignItems: "center", height: "100vh",
  position: "relative", zIndex: 1
};

const formStyle = {
  background: "rgba(20, 25, 22, 0.9)",
  padding: "40px",
  borderRadius: "26px",
  border: "2px solid var(--neon)",
  width: "100%",
  maxWidth: "400px",
  boxShadow: "0 0 30px rgba(70, 211, 126, 0.2)"
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "12px",
  border: "1px solid rgba(70,211,126,0.3)",
  background: "rgba(0,0,0,0.3)",
  color: "white",
  outline: "none"
};

const loginBtnStyle = {
  width: "100%",
  padding: "12px",
  background: "var(--neon)",
  color: "#0b0f0d",
  border: "none",
  borderRadius: "12px",
  fontWeight: "bold",
  cursor: "pointer"
};

const logoContainerStyle = {
  textAlign: "center",
  marginBottom: "40px",
};

const logoImageStyle = {
  width: "50%",      // Ajusta según el tamaño de tu PNG
  maxWidth: "150px",
  height: "auto",
  filter: "drop-shadow(0 0 10px rgba(70, 211, 126, 0.3))" // Opcional: efecto neón
};