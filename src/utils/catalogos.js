import api from '../config/api';

// Caché en memoria de /catalogos. Las tres pantallas (Producción, Mortalidad,
// Inspección) lo pedían por separado en cada apertura; ahora comparten una sola
// respuesta durante un tiempo corto, evitando llamadas redundantes.

let cache = null;
let cacheTime = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutos

export const getCatalogos = async (force = false) => {
    const now = Date.now();
    if (!force && cache && now - cacheTime < TTL_MS) {
        return cache;
    }
    const response = await api.get('/catalogos');
    cache = response.data;
    cacheTime = now;
    return cache;
};

// Se llama al cerrar sesión para no arrastrar catálogos de otro usuario/galpón.
export const clearCatalogosCache = () => {
    cache = null;
    cacheTime = 0;
};
