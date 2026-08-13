import axios from 'axios';

// =====================================================================
// 🌐 CONFIGURACIÓN DEL SERVICIO DE DATOS (API SERVER)
// =====================================================================
//
// La URL de la API se define por ENTORNO, no por código, mediante la
// variable EXPO_PUBLIC_API_URL del archivo `.env` (ver `.env.example`).
// Expo inyecta automáticamente las variables con prefijo EXPO_PUBLIC_.
//
//   Producción / túnel HTTPS:  https://tu-dominio.com/api/
//   Ngrok:                     https://xxxx.ngrok-free.dev/api/
//   Emulador Android:          http://10.0.2.2:8000/api/
//   Celular en wifi local:     http://<IP-del-PC>:8000/api/
//
// IMPORTANTE: en cualquier uso real debe ser HTTPS. Con HTTP el token de
// sesión (Bearer) viaja en texto plano y es interceptable en la red.

const FALLBACK_DEV_URL = 'http://192.168.1.60:8000/api/';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? FALLBACK_DEV_URL;

if (__DEV__ && !process.env.EXPO_PUBLIC_API_URL) {
    console.warn(
        '[api] EXPO_PUBLIC_API_URL no está definida en .env; usando fallback de desarrollo:',
        API_URL
    );
}
if (__DEV__ && API_URL.startsWith('http://')) {
    console.warn(
        '[api] La API usa HTTP sin cifrar. El token de sesión viaja en texto plano; usa HTTPS para uso real.'
    );
}

const api = axios.create({
    baseURL: API_URL,
    // Evita que una petición quede colgada indefinidamente si el servidor
    // no responde a nivel TCP (típico con señal rural intermitente). (A2)
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Evita la página intersticial de advertencia de ngrok en peticiones API.
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

// =====================================================================
// 🔐 Manejo global de sesión expirada / token inválido (401). (C2)
// ---------------------------------------------------------------------
// api.js no tiene acceso al árbol de React, así que App.js registra aquí
// un handler que limpia la sesión y devuelve al usuario al login. El
// interceptor lo dispara ante cualquier 401 que NO sea del propio login
// (el login usa 401/422 para "credenciales inválidas", eso lo maneja
// LoginScreen y no debe cerrar sesión).
// =====================================================================

let onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
    onUnauthorized = handler;
};

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || '';
        const isLoginRequest = url.includes('/login');

        if (status === 401 && !isLoginRequest && typeof onUnauthorized === 'function') {
            onUnauthorized();
        }
        return Promise.reject(error);
    }
);

export default api;
