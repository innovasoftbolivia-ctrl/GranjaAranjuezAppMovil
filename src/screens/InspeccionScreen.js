import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../config/api';
import NetInfo from '@react-native-community/netinfo';
import { addToQueue, syncOfflineData, isNetworkError } from '../utils/SyncManager';
import { getCatalogos } from '../utils/catalogos';
import { colors, radius } from '../theme';

export default function InspeccionScreen({ galpon, modo = 'entrada', onCompleted, onCancel }) {
    const esSalida = modo === 'salida';
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [items, setItems] = useState([]);
    const [encargados, setEncargados] = useState([]);
    const [idEncargado, setIdEncargado] = useState('');

    const [fecha, setFecha] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // respuestas: { [id_item]: { estado: 'bien' | 'falla', nota: '' } }
    const [respuestas, setRespuestas] = useState({});
    const [observaciones, setObservaciones] = useState('');

    const [isOffline, setIsOffline] = useState(false);
    // Guard síncrono anti-doble-submit (disabled={submitting} no basta: setSubmitting es async).
    const submittingRef = useRef(false);

    useEffect(() => {
        fetchCatalogos();
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
            if (state.isConnected) syncOfflineData();
        });
        return () => unsubscribe();
    }, []);

    const fetchCatalogos = async () => {
        try {
            const data = await getCatalogos();
            const lista = data.items_inspeccion || [];
            setItems(lista);
            setEncargados(data.encargados || []);
            if (data.encargados?.length > 0) {
                setIdEncargado(data.encargados[0].id_encargado.toString());
            }
            // Por defecto todo "Bien"; el encargado solo marca las fallas.
            const inicial = {};
            lista.forEach(it => {
                inicial[it.id_item_inspeccion] = { estado: 'bien', nota: '' };
            });
            setRespuestas(inicial);
        } catch (error) {
            Alert.alert('Error', 'No se pudieron cargar los ítems de inspección.');
        } finally {
            setLoading(false);
        }
    };

    const setEstado = (idItem, estado) => {
        setRespuestas(prev => ({
            ...prev,
            [idItem]: { ...prev[idItem], estado },
        }));
    };

    const setNota = (idItem, nota) => {
        setRespuestas(prev => ({
            ...prev,
            [idItem]: { ...prev[idItem], nota },
        }));
    };

    // --- Foto de la falla: cámara o galería, redimensionada y comprimida a base64 ---
    const capturarFoto = async (idItem, origen) => {
        try {
            const permiso = origen === 'camara'
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permiso.granted) {
                Alert.alert('Permiso requerido', 'Habilita el permiso de ' + (origen === 'camara' ? 'cámara' : 'galería') + ' para adjuntar la foto.');
                return;
            }

            const opts = { quality: 0.7 };
            const res = origen === 'camara'
                ? await ImagePicker.launchCameraAsync(opts)
                : await ImagePicker.launchImageLibraryAsync({ ...opts, mediaTypes: ['images'] });

            if (res.canceled || !res.assets?.length) return;

            // Redimensiona a máx 1024px y comprime → base64 liviano (viaja en el JSON, offline incluido).
            const img = await ImageManipulator.manipulateAsync(
                res.assets[0].uri,
                [{ resize: { width: 1024 } }],
                { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );

            setRespuestas(prev => ({
                ...prev,
                [idItem]: { ...prev[idItem], foto: img.base64, fotoUri: img.uri },
            }));
        } catch (e) {
            Alert.alert('Error', 'No se pudo procesar la foto.');
        }
    };

    const agregarFoto = (idItem) => {
        Alert.alert('Foto de la falla', '¿Desde dónde?', [
            { text: 'Cámara', onPress: () => capturarFoto(idItem, 'camara') },
            { text: 'Galería', onPress: () => capturarFoto(idItem, 'galeria') },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    const quitarFoto = (idItem) => {
        setRespuestas(prev => ({ ...prev, [idItem]: { ...prev[idItem], foto: null, fotoUri: null } }));
    };

    const contarFallas = () =>
        Object.values(respuestas).filter(r => r.estado === 'falla').length;

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) setFecha(selectedDate);
    };

    const construirPayload = () => {
        const localDate =
            fecha.getFullYear() + '-' +
            String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
            String(fecha.getDate()).padStart(2, '0');

        const itemsPayload = items.map(it => {
            const r = respuestas[it.id_item_inspeccion] || { estado: 'bien', nota: '' };
            return {
                id_item_inspeccion: it.id_item_inspeccion,
                estado: r.estado,
                nota: r.estado === 'falla' && r.nota ? r.nota : null,
                foto: r.estado === 'falla' && r.foto ? r.foto : null,
            };
        });

        return {
            id_galpon: galpon.id_galpon.toString(),
            id_encargado: idEncargado,
            fecha: localDate,
            tipo: modo, // 'entrada' | 'salida'
            observaciones: observaciones || null,
            items: itemsPayload,
        };
    };

    const handleSubmit = async () => {
        if (items.length === 0) {
            Alert.alert('Error', 'No hay ítems de inspección configurados.');
            return;
        }
        if (!idEncargado) {
            // Sin encargado el servidor devolvería 422 de validación; evitamos ese
            // camino (antes se confundía con "ya registrada" y saltaba la inspección).
            Alert.alert('Error', 'No hay un encargado disponible para registrar la inspección. Reintenta o contacta al administrador.');
            return;
        }

        if (submittingRef.current) return; // ya hay un envío en curso
        submittingRef.current = true;
        setSubmitting(true);
        const payload = construirPayload();
        try {
            const response = await api.post('/inspeccion', payload);
            Alert.alert('Éxito', response.data.message, [{ text: 'OK', onPress: onCompleted }]);
        } catch (error) {
            if (isOffline || isNetworkError(error)) {
                const saved = await addToQueue('/inspeccion', payload, 'INSPECCION');
                if (saved) {
                    Alert.alert('Modo Offline', 'Sin conexión. La inspección se guardó localmente y se sincronizará luego.', [
                        { text: 'Entendido', onPress: onCompleted },
                    ]);
                } else {
                    Alert.alert('Error', 'No se pudo guardar la inspección localmente.');
                }
            } else if (error.response?.status === 409) {
                // 409 = duplicado idempotente: ya existe esta inspección hoy → cumplida.
                // (Un 422 de validación ya NO cae aquí: se muestra abajo y NO se salta
                // la inspección obligatoria.)
                Alert.alert('Inspección ya registrada', 'Ya se había registrado esta inspección hoy. Puedes continuar.', [
                    { text: 'Continuar', onPress: onCompleted },
                ]);
            } else {
                const msg = error.response?.data?.message || 'Error al guardar la inspección';
                Alert.alert('Error', msg);
            }
        } finally {
            setSubmitting(false);
            submittingRef.current = false;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.gold} />
                <Text style={styles.loadingText}>Cargando checklist...</Text>
            </View>
        );
    }

    // Agrupa los ítems por categoría preservando el orden de llegada.
    const categorias = [];
    items.forEach(it => {
        const cat = it.categoria || 'General';
        if (!categorias.includes(cat)) categorias.push(cat);
    });

    const fallas = contarFallas();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onCancel} style={styles.backButton}>
                    <Text style={styles.backText}>{esSalida ? '← Cancelar' : '← Cambiar galpón'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{esSalida ? 'Inspección de Salida' : 'Inspección de Entrada'}</Text>
                <Text style={styles.subtitle}>{esSalida ? 'Obligatoria para cerrar sesión' : 'Obligatoria para iniciar el turno'}</Text>
            </View>

            <View style={styles.formCard}>
                <Text style={styles.label}>GALPÓN (ESCANEADO)</Text>
                <View style={styles.galponFijo}>
                    <Text style={styles.galponNombre}>📋 {galpon.nombre}</Text>
                </View>

                <Text style={styles.label}>FECHA DE INSPECCIÓN</Text>
                <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.dateText}>{fecha.toLocaleDateString()}</Text>
                    <Text style={styles.changeText}>CAMBIAR</Text>
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker value={fecha} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />
                )}
            </View>

            {/* Resumen de fallas */}
            <View style={[styles.resumen, fallas > 0 ? styles.resumenFalla : styles.resumenOk]}>
                <Text style={styles.resumenText}>
                    {fallas > 0
                        ? `⚠️ ${fallas} falla(s) marcada(s) de ${items.length} ítems`
                        : `✅ Todo en orden (${items.length} ítems)`}
                </Text>
            </View>

            {/* Checklist agrupado por categoría */}
            {categorias.map(cat => (
                <View key={cat} style={styles.categoriaSection}>
                    <Text style={styles.categoriaTitle}>{cat.toUpperCase()}</Text>
                    {items.filter(it => (it.categoria || 'General') === cat).map(it => {
                        const r = respuestas[it.id_item_inspeccion] || { estado: 'bien', nota: '' };
                        const esFalla = r.estado === 'falla';
                        return (
                            <View key={it.id_item_inspeccion} style={styles.itemCard}>
                                <Text style={styles.itemNombre}>{it.nombre}</Text>
                                <View style={styles.toggleRow}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, !esFalla && styles.toggleBien]}
                                        onPress={() => setEstado(it.id_item_inspeccion, 'bien')}
                                    >
                                        <Text style={[styles.toggleText, !esFalla && styles.toggleTextActive]}>✓ Bien</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, esFalla && styles.toggleFalla]}
                                        onPress={() => setEstado(it.id_item_inspeccion, 'falla')}
                                    >
                                        <Text style={[styles.toggleText, esFalla && styles.toggleTextActive]}>✕ Falla</Text>
                                    </TouchableOpacity>
                                </View>
                                {esFalla && (
                                    <>
                                        <TextInput
                                            style={styles.notaInput}
                                            placeholder="Describe la falla (opcional)"
                                            placeholderTextColor={colors.textFaint}
                                            value={r.nota}
                                            onChangeText={(val) => setNota(it.id_item_inspeccion, val)}
                                            multiline
                                        />
                                        {r.fotoUri ? (
                                            <View style={styles.fotoRow}>
                                                <Image source={{ uri: r.fotoUri }} style={styles.fotoThumb} />
                                                <TouchableOpacity style={styles.fotoQuitar} onPress={() => quitarFoto(it.id_item_inspeccion)}>
                                                    <Text style={styles.fotoQuitarText}>✕ Quitar foto</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity style={styles.fotoBtn} onPress={() => agregarFoto(it.id_item_inspeccion)}>
                                                <Text style={styles.fotoBtnText}>📷 Agregar foto</Text>
                                            </TouchableOpacity>
                                        )}
                                    </>
                                )}
                            </View>
                        );
                    })}
                </View>
            ))}

            {/* Observaciones generales */}
            <View style={styles.obsSection}>
                <Text style={styles.categoriaTitle}>OTRAS OBSERVACIONES</Text>
                <TextInput
                    style={styles.obsInput}
                    placeholder="Anota cualquier otro detalle del galpón..."
                    placeholderTextColor="#555"
                    value={observaciones}
                    onChangeText={setObservaciones}
                    multiline
                />
            </View>

            <TouchableOpacity
                style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator color={colors.onGold} />
                ) : (
                    <Text style={styles.saveButtonText}>{esSalida ? 'GUARDAR Y CERRAR SESIÓN' : 'GUARDAR Y CONTINUAR'}</Text>
                )}
            </TouchableOpacity>

            <View style={{ height: 50 }} />
        </ScrollView>
    );
}

const GOLD = colors.gold;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    loadingText: { marginTop: 10, color: GOLD, fontWeight: '700' },
    header: {
        paddingTop: 60,
        paddingHorizontal: 25,
        paddingBottom: 22,
        backgroundColor: colors.panel,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    backButton: { marginBottom: 10 },
    backText: { color: GOLD, fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12 },
    title: { fontSize: 26, fontWeight: 'bold', color: colors.text },
    subtitle: { fontSize: 12, color: GOLD, marginTop: 6, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
    formCard: {
        margin: 20,
        backgroundColor: colors.card,
        padding: 22,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    label: { fontSize: 11, color: GOLD, marginBottom: 8, fontWeight: 'bold', letterSpacing: 1 },
    galponFijo: {
        backgroundColor: colors.inputBg,
        borderRadius: radius.control,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.goldBorder,
        padding: 16,
    },
    galponNombre: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    dateSelector: {
        backgroundColor: colors.inputBg,
        padding: 16,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: { fontSize: 16, color: colors.text, fontWeight: 'bold' },
    changeText: { fontSize: 10, color: GOLD, fontWeight: 'bold' },
    resumen: {
        marginHorizontal: 20,
        marginBottom: 10,
        padding: 14,
        borderRadius: radius.card,
        alignItems: 'center',
        borderWidth: 1,
    },
    resumenOk: { backgroundColor: colors.successSoft, borderColor: colors.successBorder },
    resumenFalla: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder },
    resumenText: { color: colors.text, fontWeight: '700', fontSize: 14 },
    categoriaSection: { marginHorizontal: 20, marginTop: 10, marginBottom: 5 },
    categoriaTitle: { fontSize: 12, fontWeight: 'bold', color: GOLD, marginBottom: 12, letterSpacing: 2 },
    itemCard: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: radius.card,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    itemNombre: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 14 },
    toggleRow: { flexDirection: 'row', gap: 10 },
    toggleBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: radius.control,
        alignItems: 'center',
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    toggleBien: { backgroundColor: colors.successSoft, borderColor: colors.success },
    toggleFalla: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    toggleText: { color: colors.textMuted, fontWeight: 'bold', fontSize: 14 },
    toggleTextActive: { color: colors.text },
    notaInput: {
        marginTop: 12,
        backgroundColor: colors.inputBg,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.dangerBorder,
        padding: 12,
        color: colors.text,
        minHeight: 44,
        textAlignVertical: 'top',
    },
    fotoBtn: {
        marginTop: 10,
        backgroundColor: colors.goldSoftBg,
        borderWidth: 1,
        borderColor: colors.goldBorder,
        borderRadius: radius.control,
        paddingVertical: 12,
        alignItems: 'center',
    },
    fotoBtnText: { color: colors.gold, fontWeight: 'bold', fontSize: 14 },
    fotoRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
    fotoThumb: { width: 64, height: 64, borderRadius: radius.control, borderWidth: 1, borderColor: colors.borderHover },
    fotoQuitar: { marginLeft: 14 },
    fotoQuitarText: { color: colors.danger, fontWeight: 'bold', fontSize: 13 },
    obsSection: { marginHorizontal: 20, marginTop: 15, marginBottom: 20 },
    obsInput: {
        backgroundColor: colors.card,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        color: colors.text,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    saveButton: {
        marginHorizontal: 20,
        backgroundColor: GOLD,
        padding: 18,
        borderRadius: radius.control,
        alignItems: 'center',
    },
    saveButtonDisabled: { backgroundColor: '#666', opacity: 0.6 },
    saveButtonText: { color: colors.onGold, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
});
