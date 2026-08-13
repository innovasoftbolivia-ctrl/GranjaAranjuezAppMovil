import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, Text, View, FlatList, ActivityIndicator, 
    TouchableOpacity, SafeAreaView, RefreshControl 
} from 'react-native';
import api from '../config/api';
import { colors, radius } from '../theme';

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
            <View style={[styles.iconContainer, { backgroundColor: item.tipo === 'produccion' ? colors.goldSoft : colors.dangerSoft }]}>
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
                <Text style={[styles.cardResumen, { color: item.tipo === 'produccion' ? colors.gold : colors.danger }]}>
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
                    <ActivityIndicator size="large" color={colors.gold} />
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
                    keyExtractor={item => `${item.tipo}-${item.id}`}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {user?.role === 'admin' 
                                    ? 'No hay registros de actividad en los últimos 15 días.' 
                                    : 'No hay registros en los últimos 15 días.'}
                            </Text>
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
        backgroundColor: colors.bg,
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 25,
        paddingBottom: 22,
        backgroundColor: colors.panel,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    backButton: {
        marginRight: 15,
    },
    backText: {
        color: colors.gold,
        fontWeight: 'bold',
        fontSize: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        letterSpacing: -0.5,
    },
    list: {
        padding: 20,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: radius.card,
        padding: 16,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: radius.chip,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardIcon: {
        fontSize: 24,
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
        color: colors.text,
        flex: 1,
    },
    cardDate: {
        fontSize: 13,
        color: colors.textMuted,
    },
    cardGalpon: {
        fontSize: 14,
        color: colors.textMuted,
    },
    cardResumen: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 4,
    },
    cardEncargado: {
        fontSize: 13,
        color: colors.textMuted,
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
        color: colors.textMuted,
    },
    errorText: {
        color: colors.danger,
        fontSize: 16,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: colors.gold,
        borderRadius: radius.control,
    },
    retryText: {
        color: colors.onGold,
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyContainer: {
        padding: 50,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textMuted,
        textAlign: 'center',
    }
});
