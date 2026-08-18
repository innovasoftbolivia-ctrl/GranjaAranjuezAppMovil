import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getQueue, syncOfflineData } from '../utils/SyncManager';
import api from '../config/api';
import { colors, radius } from '../theme';

export default function HomeScreen({ user, galpon, onNavigate, onLogout, onChangeGalpon }) {
    const [isOffline, setIsOffline] = useState(false);
    const [queueCount, setQueueCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [avisos, setAvisos] = useState([]);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
            if (state.isConnected) {
                checkQueue();
            }
        });
        
        checkQueue();
        cargarAvisos();

        return () => unsubscribe();
    }, [galpon?.id_galpon]);

    /*
     * Avisos del galpon en el que esta parado el encargado.
     *
     * Fallan en silencio a proposito: son informacion de apoyo, no parte del
     * registro. Sin senal en el galpon -que es lo normal- la pantalla debe seguir
     * sirviendo para anotar produccion y mortalidad, que es a lo que se vino.
     */
    const cargarAvisos = async () => {
        if (!galpon?.id_galpon) return;

        try {
            const { data } = await api.get('alertas', { params: { id_galpon: galpon.id_galpon } });
            setAvisos(data.alertas ?? []);
        } catch (e) {
            setAvisos([]);
        }
    };

    const checkQueue = async () => {
        const q = await getQueue();
        setQueueCount(q.length);
    };

    const handleManualSync = async () => {
        if (isOffline) {
            Alert.alert('Error', 'No hay conexión a internet.');
            return;
        }
        setIsSyncing(true);
        const result = await syncOfflineData();
        setIsSyncing(false);
        if (result.busy) {
            // Ya había una sincronización en curso; no mostramos nada.
        } else if (result.rejected > 0) {
            // El servidor rechazó datos (4xx no-duplicado): no se guardaron y no se
            // reintentarán. Es importante NO decir "ya estaban registrados".
            Alert.alert(
                'Atención',
                `${result.rejected} registro(s) fueron rechazados por el servidor y no se guardaron. Avisa al administrador.` +
                (result.pending > 0 ? `\nQuedan ${result.pending} pendiente(s) por reintentar.` : '')
            );
        } else if (result.success) {
            const procesados = result.synced + result.resolved;
            if (procesados > 0) {
                const detalle = result.resolved > 0
                    ? `${result.synced} enviados, ${result.resolved} ya estaban registrados.`
                    : `${result.synced} registros enviados.`;
                Alert.alert('Éxito', `Sincronización completa. ${detalle}`);
            }
        } else {
            Alert.alert('Atención', `Quedan ${result.pending} registro(s) pendientes. Reintenta cuando tengas mejor señal.`);
        }
        checkQueue();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.welcome}>¡Hola, {user?.name?.split(' ')[0] ?? 'Usuario'}!</Text>
                        <Text style={styles.subtitle}>Granja AA • Gestión Privada</Text>
                    </View>
                    <Image 
                        source={require('../../assets/logo.png')} 
                        style={styles.logoHeader}
                        resizeMode="contain"
                    />
                </View>
            </View>

            <View style={styles.galponBanner}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.galponBannerLabel}>GALPÓN ACTIVO</Text>
                    <Text style={styles.galponBannerName}>📍 {galpon?.nombre ?? 'Sin galpón'}</Text>
                </View>
                <TouchableOpacity style={styles.galponChangeBtn} onPress={onChangeGalpon}>
                    <Text style={styles.galponChangeText}>Cambiar</Text>
                </TouchableOpacity>
            </View>

            {avisos.map((aviso, i) => (
                <View
                    key={i}
                    style={[
                        styles.avisoBanner,
                        aviso.gravedad === 'critica' && styles.avisoCritico,
                        aviso.gravedad === 'info' && styles.avisoInfo,
                    ]}
                >
                    <Text style={styles.avisoTitulo}>{aviso.titulo}</Text>
                    <Text style={styles.avisoMensaje}>{aviso.mensaje}</Text>
                </View>
            ))}

            {isOffline && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>⚠️ Sin conexión. Modo offline activo.</Text>
                </View>
            )}

            {!isOffline && queueCount > 0 && (
                <View style={styles.syncBannerContainer}>
                    <Text style={styles.syncBannerText}>Tienes {queueCount} pendientes</Text>
                    <TouchableOpacity style={styles.syncBtn} onPress={handleManualSync} disabled={isSyncing}>
                        {isSyncing ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.syncBtnText}>Sincronizar</Text>}
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.menuArea}>
                <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('produccion')}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.goldSoft }]}>
                            <Text style={styles.icon}>🥚</Text>
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.menuTitle}>Producción</Text>
                            <Text style={styles.menuDesc}>Control de recolección diaria</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('mortalidad')}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.dangerSoft }]}>
                            <Text style={styles.icon}>💀</Text>
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.menuTitle}>Mortalidad</Text>
                            <Text style={styles.menuDesc}>Reportes y cálculo de bajas</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('historial')}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.goldSoft }]}>
                            <Text style={styles.icon}>📋</Text>
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.menuTitle}>Actividad</Text>
                            <Text style={styles.menuDesc}>Bitácora de los últimos 15 días</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                    <Text style={styles.logoutText}>Cerrar sesión (requiere inspección)</Text>
                </TouchableOpacity>
                
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Granja Sistema Conectado AA • v2.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 28,
        paddingBottom: 28,
        backgroundColor: colors.panel,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    avisoBanner: {
        backgroundColor: 'rgba(217, 179, 0, 0.12)',
        borderLeftWidth: 4,
        borderLeftColor: colors.gold,
        borderRadius: radius.control,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 20,
        marginBottom: 12,
    },
    avisoCritico: {
        backgroundColor: 'rgba(248, 113, 113, 0.15)',
        borderLeftColor: colors.danger,
    },
    avisoInfo: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderLeftColor: colors.textMuted,
    },
    avisoTitulo: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 14,
        marginBottom: 4,
    },
    avisoMensaje: {
        color: colors.textMuted,
        fontSize: 12.5,
        lineHeight: 18,
    },
    galponBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        marginHorizontal: 20,
        marginTop: 20,
        padding: 16,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.goldBorder,
    },
    galponBannerLabel: {
        fontSize: 10,
        color: colors.gold,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    galponBannerName: {
        fontSize: 18,
        color: colors.text,
        fontWeight: 'bold',
        marginTop: 2,
    },
    galponChangeBtn: {
        backgroundColor: colors.goldSoft,
        borderWidth: 1,
        borderColor: colors.goldBorder,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: radius.control,
    },
    galponChangeText: {
        color: colors.gold,
        fontWeight: 'bold',
        fontSize: 13,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcome: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 14,
        color: colors.gold,
        marginTop: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    logoHeader: {
        width: 60,
        height: 60,
        borderRadius: radius.chip,
        backgroundColor: colors.goldSoft,
        borderWidth: 1,
        borderColor: colors.border,
    },
    menuArea: {
        padding: 20,
        paddingTop: 28,
    },
    menuCard: {
        borderRadius: radius.card,
        padding: 18,
        marginBottom: 16,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: radius.chip,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    icon: {
        fontSize: 28,
    },
    textContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 19,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 2,
    },
    menuDesc: {
        fontSize: 13,
        color: colors.textMuted,
    },
    logoutButton: {
        marginTop: 24,
        padding: 18,
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    logoutText: {
        color: colors.textMuted,
        fontWeight: '700',
        fontSize: 15,
    },
    footer: {
        marginTop: 40,
        paddingBottom: 20,
        alignItems: 'center',
    },
    footerText: {
        color: colors.textFaint,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    },
    offlineBanner: {
        backgroundColor: colors.gold,
        padding: 10,
        alignItems: 'center',
    },
    offlineText: {
        color: colors.onGold,
        fontWeight: 'bold',
        fontSize: 12,
    },
    syncBannerContainer: {
        backgroundColor: colors.card,
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    syncBannerText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    syncBtn: {
        backgroundColor: colors.gold,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: radius.control,
    },
    syncBtnText: {
        color: colors.onGold,
        fontWeight: 'bold',
        fontSize: 12,
    }
});
