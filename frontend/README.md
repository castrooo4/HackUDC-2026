# Frontend - Remit

Aplicación web React para visualizar, filtrar y organizar el inbox.

## Stack
- React
- Vite
- React Router
- Fetch API (cliente en `src/api`)

## Requisitos
- Node.js `20+`

## Ejecución local
```powershell
cd frontend
npm install
npm run dev
```

App local:
- `http://127.0.0.1:5173`

## Configuración
1. Copia variables de entorno:
```powershell
Copy-Item .env.example .env
```
2. (Opcional) crea overrides locales en `.env.local`.

Variables disponibles:
- `VITE_API_BASE`: URL base del backend
- `VITE_REMIT_EVENT_SOURCE`: fuente de eventos para sincronización web-extensión
- `VITE_GEOLOCATION_TIMEOUT_MS`: timeout de geolocalización en UI
- `VITE_MAP_TILE_URL`: URL de tiles del mapa
- `VITE_MAP_TILE_ATTRIBUTION`: atribución del proveedor de mapa

## Scripts
- `npm run dev`: servidor de desarrollo
- `npm run build`: build de producción
- `npm run lint`: validación ESLint
- `npm run preview`: previsualización de build

## Estructura
- `src/api`: llamadas HTTP
- `src/components`: componentes reutilizables
- `src/views`: pantallas por ruta
- `src/utils`: utilidades de UI y datos
- `src/config`: configuración de entorno

## Integración con extensión
La app emite eventos de sincronización de sesión y refresh de inbox para la extensión mediante `window.postMessage` (ver `src/utils/bridgeEvents.js`).
