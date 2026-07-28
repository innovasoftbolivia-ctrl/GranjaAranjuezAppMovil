import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, Text, View, FlatList, ActivityIndicator, 
    TouchableOpacity, SafeAreaView, RefreshControl 
} from 'react-native';
import api from '../config/api';

export default function HistorialScreen({ onBack, user }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);

    const fetchHistorial = async () => {
        try {
            setLoading(true);
            const response = await api.get('/historial');
            setData(response.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Error al cargar historial');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHistorial();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistorial();
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: item.tipo === 'produccion' ? 'rgba(255, 199, 0, 0.1)' : 'rgba(241, 65, 108, 0.1)' }]}>
                <Text style={styles.cardIcon}>{item.tipo === 'produccion' ? '🥚' : '💀'}</Text>
            </View>
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                        {item.tipo === 'produccion' ? 'Producción' : 'Mortalidad'}
                    </Text>
                    <Text style={styles.cardDate}>{item.fecha}</Text>
                </View>
                <Text style={styles.cardGalpon}>Galpón: {item.galpon}</Text>
                <Text style={[styles.cardResumen, { color: item.tipo === 'produccion' ? '#ffc700' : '#f1416c' }]}>
                    {item.resumen}
                </Text>
                {user.role === 'admin' && (
                    <Text style={styles.cardEncargado}>Por: {item.encargado}</Text>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backText}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Historial (15 Días)</Text>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#009ef7" />
                    <Text style={styles.loadingText}>Cargando actividad reciente...</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>❌ {error}</Text>
                    <TouchableOpacity onPress={fetchHistorial} style={styles.retryButton}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No hay registros en los últimos 15 días.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f15',
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 25,
        paddingBottom: 25,
        backgroundColor: '#13131a',
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.02)',
    },
    backButton: {
        marginRight: 15,
    },
    backText: {
        color: '#009ef7',
        fontWeight: 'bold',
        fontSize: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    list: {
        padding: 20,
    },
    card: {
        backgroundColor: '#181822',
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    iconContainer: {
        width: 55,
        height: 55,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 18,
    },
    cardIcon: {
        fontSize: 26,
    },
    cardContent: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#ffffff',
        flex: 1,
    },
    cardDate: {
        fontSize: 13,
        color: '#8e8f9e',
    },
    cardGalpon: {
        fontSize: 14,
        color: '#8e8f9e',
    },
    cardResumen: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 4,
    },
    cardEncargado: {
        fontSize: 13,
        color: '#8e8f9e',
        marginTop: 6,
        fontStyle: 'italic',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        color: '#8e8f9e',
    },
    errorText: {
        color: '#f1416c',
        fontSize: 16,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#009ef7',
        borderRadius: 12,
        elevation: 4,
    },
    retryText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyContainer: {
        padding: 50,
        alignItems: 'center',
    },
    emptyText: {
        color: '#8e8f9e',
        textAlign: 'center',
    }
});
