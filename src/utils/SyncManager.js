import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from '../config/api';
import { isNetworkError } from './net';

const QUEUE_KEY = '@sync_queue';

// Se re-exporta para que las pantallas lo sigan importando desde SyncManager. (A3)
export { isNetworkError };

// Candado en memoria: los listeners de NetInfo están montados en varias
// pantallas y todos disparan syncOfflineData() al recuperar conexión. Sin
// este flag, varias pasadas concurrentes recorrerían la MISMA cola a la vez
// y reenviarían los registros por duplicado. (C3)
let isSyncing = false;

// Id local único para cada item de la cola (solo para gestión interna; no se
// envía al servidor). `Date.now()` solo podía colisionar si se encolaban dos
// registros en el mismo milisegundo; le añadimos un componente aleatorio.
const generateId = () => `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

export const addToQueue = async (endpoint, data, type) => {
    try {
        const currentQueue = await getQueue();
        const newItem = {
            id: generateId(),
            endpoint,
            data,
            type, // 'PRODUCCION' | 'MORTALIDAD'
            timestamp: new Date().toISOString(),
        };

        const updatedQueue = [...currentQueue, newItem];
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
        console.log('Registro guardado en cola offline:', type);
        return true;
    } catch (error) {
        console.error('Error al guardar en cola:', error);
        return false;
    }
};

export const getQueue = async () => {
    try {
        const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
        return queueStr ? JSON.parse(queueStr) : [];
    } catch (error) {
        return [];
    }
};

export const clearQueue = async () => {
    await AsyncStorage.removeItem(QUEUE_KEY);
};

export const syncOfflineData = async () => {
    // Si ya hay una sincronización en curso, no arrancamos otra. (C3)
    // IMPORTANTE: el candado se fija de forma SÍNCRONA, antes de cualquier
    // `await`. Si se fijara después de los await (NetInfo/getQueue), dos
    // llamadas casi simultáneas —los listeners de NetInfo están montados en
    // varias pantallas— pasarían ambas el check con `isSyncing === false` y
    // recorrerían la misma cola en paralelo, reenviando registros por duplicado.
    if (isSyncing) {
        return { success: false, synced: 0, resolved: 0, rejected: 0, pending: 0, busy: true };
    }
    isSyncing = true;

    let syncedCount = 0; // enviados con éxito (2xx)
    let resolvedCount = 0; // 409: ya existían en el servidor (duplicado idempotente)
    let rejectedCount = 0; // otros 4xx: el servidor rechazó el dato (validación, etc.)
    const pendingItems = []; // solo se conservan los fallos transitorios (red / 5xx)

    try {
        const state = await NetInfo.fetch();
        if (!state.isConnected) {
            return { success: false, synced: 0, resolved: 0, rejected: 0, pending: 0 };
        }

        const queue = await getQueue();
        if (queue.length === 0) {
            return { success: true, synced: 0, resolved: 0, rejected: 0, pending: 0 };
        }

        for (const item of queue) {
            try {
                await api.post(item.endpoint, item.data);
                syncedCount++;
            } catch (error) {
                const status = error.response?.status;

                if (isNetworkError(error) || status >= 500) {
                    // Fallo transitorio (red caída / servidor 5xx): se reintenta
                    // en la próxima sincronización.
                    pendingItems.push(item);
                } else if (status === 409) {
                    // Duplicado idempotente: el servidor confirma que el registro YA
                    // estaba guardado (el UNIQUE de la clave natural actúa como clave
                    // de idempotencia) aunque se hubiera perdido la respuesta. Se saca
                    // de la cola como resuelto con éxito. (C3)
                    resolvedCount++;
                } else {
                    // Otros 4xx (422 validación, 400, 403…): reintentar NUNCA dará 2xx,
                    // así que se saca de la cola para no bloquearla. Pero NO es un éxito:
                    // el servidor rechazó el dato, así que se cuenta como RECHAZADO para
                    // avisar al usuario en vez de decir falsamente "ya estaba registrado".
                    rejectedCount++;
                    console.warn(
                        'Item RECHAZADO por el servidor (4xx no-duplicado):',
                        item.id,
                        status,
                        error.response?.data?.message
                    );
                }
            }
        }

        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(pendingItems));

        return {
            success: pendingItems.length === 0,
            synced: syncedCount,
            resolved: resolvedCount,
            rejected: rejectedCount,
            pending: pendingItems.length,
        };
    } finally {
        // Pase lo que pase, liberamos el candado. (C3)
        isSyncing = false;
    }
};
