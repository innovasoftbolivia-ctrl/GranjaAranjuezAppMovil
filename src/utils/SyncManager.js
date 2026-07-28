import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from '../config/api';

const QUEUE_KEY = '@sync_queue';

export const addToQueue = async (endpoint, data, type) => {
    try {
        const currentQueue = await getQueue();
        const newItem = {
            id: Date.now().toString(),
            endpoint,
            data,
            type, // 'PRODUCCION' | 'MORTALIDAD'
            timestamp: new Date().toISOString()
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
    const state = await NetInfo.fetch();
    if (!state.isConnected) return { success: false, synced: 0 };

    const queue = await getQueue();
    if (queue.length === 0) return { success: true, synced: 0 };

    let syncedCount = 0;
    const failedItems = [];

    for (const item of queue) {
        try {
            await api.post(item.endpoint, item.data);
            syncedCount++;
        } catch (error) {
            console.error('Error sincronizando item:', item.id, error);
            failedItems.push(item);
        }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedItems));
    
    return {
        success: failedItems.length === 0,
        synced: syncedCount
    };
};
