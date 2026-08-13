import axios from 'axios';

// =====================================================================
// 🌐 CONFIGURACIÓN DEL SERVICIO DE DATOS (API SERVER)
// =====================================================================

// URL base de la API del backend.
//  - Desarrollo (celular en la misma wifi): usa la IP local de tu PC.
//  - Producción (nube): reemplaza por la URL pública del backend, p. ej.
//    'https://api.tudominio.com/api/'
export const API_URL = 'http://192.168.1.16:8000/api/';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
