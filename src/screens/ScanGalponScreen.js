import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { parseGalponQR } from '../utils/qr';
import { colors, radius } from '../theme';

export default function ScanGalponScreen({ onScanned }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const handleBarcodeScanned = ({ data }) => {
        if (scanned) return;
        setScanned(true);

        const galpon = parseGalponQR(data);
        if (galpon) {
            onScanned(galpon);
        } else {
            setErrorMsg('Este código QR no corresponde a un galpón de Granja AA.');
        }
    };

    const resetScan = () => {
        setErrorMsg(null);
        setScanned(false);
    };

    // --- Estados de permiso de cámara ---
    if (!permission) {
        // Aún cargando el estado del permiso
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.gold} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.centered}>
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Acceso a la cámara</Text>
                <Text style={styles.subtitle}>
                    Necesitamos la cámara para escanear el código QR del galpón.
                </Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Permitir cámara</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // --- Cámara activa ---
    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Capa de instrucciones y marco */}
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Granja AA</Text>
                    <Text style={styles.headerSubtitle}>Escanea el QR del galpón</Text>
                </View>

                <View style={styles.frameArea}>
                    <View style={styles.frame} />
                    <Text style={styles.frameHint}>Encuadra el código dentro del recuadro</Text>
                </View>

                <View style={styles.footer}>
                    {errorMsg ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{errorMsg}</Text>
                            <TouchableOpacity style={styles.retryButton} onPress={resetScan}>
                                <Text style={styles.retryText}>Escanear de nuevo</Text>
                            </TouchableOpacity>
                        </View>
                    ) : scanned ? (
                        <ActivityIndicator size="large" color={colors.gold} />
                    ) : (
                        <Text style={styles.footerText}>SISTEMA DE GESTIÓN AVÍCOLA AA</Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const GOLD = colors.gold;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centered: {
        flex: 1,
        backgroundColor: colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    logo: { width: 90, height: 90, borderRadius: radius.chip, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
    subtitle: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
    },
    button: {
        backgroundColor: GOLD,
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: radius.control,
    },
    buttonText: { color: colors.onGold, fontWeight: 'bold', fontSize: 16 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        paddingVertical: 70,
    },
    header: { alignItems: 'center' },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: GOLD,
        marginTop: 6,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    frameArea: { alignItems: 'center' },
    frame: {
        width: 250,
        height: 250,
        borderWidth: 3,
        borderColor: GOLD,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    frameHint: { color: '#e5e5e5', marginTop: 20, fontSize: 13 },
    footer: { alignItems: 'center', minHeight: 90, justifyContent: 'center', paddingHorizontal: 30 },
    footerText: {
        color: '#8a8a8a',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    },
    errorBox: { alignItems: 'center' },
    errorText: {
        color: colors.danger,
        textAlign: 'center',
        fontSize: 14,
        marginBottom: 14,
        fontWeight: '600',
    },
    retryButton: {
        backgroundColor: GOLD,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: radius.control,
    },
    retryText: { color: colors.onGold, fontWeight: 'bold', fontSize: 14 },
});
