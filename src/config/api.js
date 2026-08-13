import axios from 'axios';

// =====================================================================
// 🌐 CONFIGURACIÓN DEL SERVICIO DE DATOS (API SERVER)
// =====================================================================

// URL base de la API del backend.
// Se puede sobreescribir sin tocar código con la variable EXPO_PUBLIC_API_URL
// (archivo .env de Expo). Si no está definida, se usa el túnel ngrok:
// en la PC debe estar corriendo:
//   ngrok http --domain=obedient-poplar-posted.ngrok-free.dev 8000
// Cuando exista el dominio propio, basta con definir EXPO_PUBLIC_API_URL
// (p. ej. 'https://granja.innovasoftbo.com/api/') y recompilar.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://obedient-poplar-posted.ngrok-free.dev/api/';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Evita la página de advertencia de ngrok en el plan gratuito;
        // es inofensivo cuando se use un dominio propio.
        'ngrok-skip-browser-warning': 'true',
    },
});

export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

// Callback que la app registra para cerrar sesión cuando el servidor
// responde 401 (token expirado o revocado).
let onUnauthorized = null;

export const setOnUnauthorized = (callback) => {
    onUnauthorized = callback;
};

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const isLoginRequest = error.config?.url?.includes('login');
        if (status === 401 && !isLoginRequest && onUnauthorized) {
            onUnauthorized();
        }
        return Promise.reject(error);
    }
);

export default api;
