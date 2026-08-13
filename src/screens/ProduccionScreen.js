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
    Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../config/api';
import NetInfo from '@react-native-community/netinfo';
import { addToQueue, syncOfflineData, isNetworkError } from '../utils/SyncManager';
import { getCatalogos } from '../utils/catalogos';
import { colors, radius } from '../theme';

export default function ProduccionScreen({ onBack, galpon }) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Catalogos
    const [galpones, setGalpones] = useState([]);
    const [encargados, setEncargados] = useState([]);
    const [tiposProduccion, setTiposProduccion] = useState([]);

    // Form State — el galpón queda FIJADO al que se escaneó (no se elige).
    const [idGalpon] = useState(galpon.id_galpon.toString());
    const [idEncargado, setIdEncargado] = useState('');
    const [fecha, setFecha] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [cantidades, setCantidades] = useState({});

    const [isOffline, setIsOffline] = useState(false);
    // Guard síncrono anti-doble-submit: `disabled={submitting}` no basta porque
    // setSubmitting es asíncrono (un doble toque muy rápido dispara handleSubmit
    // dos veces antes del re-render).
    const submittingRef = useRef(false);

    useEffect(() => {
        fetchCatalogos();
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
            if (state.isConnected) {
                syncOfflineData();
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchCatalogos = async () => {
        try {
            const data = await getCatalogos();
            setGalpones(data.galpones);
            setEncargados(data.encargados);
            setTiposProduccion(data.tipos_produccion);
            if (data.encargados.length > 0) setIdEncargado(data.encargados[0].id_encargado.toString());
        } catch (error) {
            Alert.alert('Error', 'No se pudieron cargar los datos base.');
        } finally {
            setLoading(false);
        }
    };

    const handleCantidadChange = (idTipo, value) => {
        setCantidades(prev => ({
            ...prev,
            [idTipo]: value
        }));
    };

    const handleDecrement = (idTipo) => {
        const idStr = idTipo.toString();
        const currentVal = parseInt(cantidades[idStr]) || 0;
        if (currentVal > 1) {
            handleCantidadChange(idTipo, (currentVal - 1).toString());
        } else {
            handleCantidadChange(idTipo, '');
        }
    };

    const handleIncrement = (idTipo) => {
        const idStr = idTipo.toString();
        const currentVal = parseInt(cantidades[idStr]) || 0;
        handleCantidadChange(idTipo, (currentVal + 1).toString());
    };

    const calculateTotal = () => {
        let total = 0;
        tiposProduccion.forEach(tipo => {
            const cant = parseInt(cantidades[tipo.id_tipo_produccion.toString()]) || 0;
            total += (cant * tipo.factor_conversion);
        });
        return total;
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) setFecha(selectedDate);
    };

    const handleSubmit = async () => {
        if (!idGalpon || !idEncargado) {
            Alert.alert('Error', 'Completa Galpón y Encargado');
            return;
        }

        const selectedGalpon = galpones.find(g => g.id_galpon.toString() === idGalpon);
        if (selectedGalpon && !selectedGalpon.lote_activo) {
            Alert.alert('Error', 'Este galpón no tiene un lote activo asignado.');
            return;
        }
        const validCantidades = Object.keys(cantidades).filter(key => parseInt(cantidades[key]) > 0);
        if (validCantidades.length === 0) {
            Alert.alert('Error', 'Ingresa al menos una cantidad');
            return;
        }

        if (submittingRef.current) return; // ya hay un envío en curso
        submittingRef.current = true;
        setSubmitting(true);
        try {
            const localDate = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
            const payload = { id_galpon: idGalpon, id_encargado: idEncargado, fecha: localDate, cantidades: cantidades };
            const response = await api.post('/produccion', payload);
            Alert.alert('Éxito', response.data.message);
            onBack();
        } catch (error) {
            if (isOffline || isNetworkError(error)) {
                const localDate = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
                const payload = { id_galpon: idGalpon, id_encargado: idEncargado, fecha: localDate, cantidades: cantidades };
                const saved = await addToQueue('/produccion', payload, 'PRODUCCION');
                if (saved) {
                    Alert.alert('Modo Offline', 'No hay conexión. El registro se guardó localmente y se sincronizará luego.');
                    onBack();
                } else {
                    Alert.alert('Error', 'No se pudo guardar el registro localmente.');
                }
            } else {
                const msg = error.response?.data?.message || 'Error al guardar';
                Alert.alert('Error', msg);
            }
        } finally {
            setSubmitting(false);
            submittingRef.current = false;
        }
    };

    // Datos del galpón escaneado (para mostrar su lote activo).
    const galponActual = galpones.find(g => g.id_galpon.toString() === idGalpon);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.gold} />
                <Text style={styles.loadingText}>Sincronizando catálogos...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backText}>← Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Registrar Producción</Text>
            </View>

            <View style={styles.formCard}>
                <Text style={styles.label}>GALPÓN (ESCANEADO)</Text>
                <View style={styles.galponFijo}>
                    <Text style={styles.galponNombre}>🥚 {galpon.nombre}</Text>
                    <Text style={styles.galponLote}>
                        {galponActual
                            ? (galponActual.lote_activo
                                ? `Lote activo: ${galponActual.lote_activo}`
                                : 'Sin lote activo asignado')
                            : 'Galpón no encontrado en el catálogo'}
                    </Text>
                </View>

                <Text style={styles.label}>FECHA DE COLECTA</Text>
                <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.dateText}>{fecha.toLocaleDateString()}</Text>
                    <Text style={styles.changeText}>CAMBIAR</Text>
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker value={fecha} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />
                )}
            </View>

            <View style={styles.cantidadesSection}>
                <Text style={styles.sectionTitle}>UNIDADES RECOLECTADAS</Text>
                {tiposProduccion?.map(tipo => {
                    const tipoIdStr = tipo.id_tipo_produccion.toString();
                    return (
                        <View key={tipo.id_tipo_produccion} style={styles.cantidadRow}>
                            <View style={styles.tipoInfo}>
                                <Text style={styles.tipoNombre}>{tipo.nombre}</Text>
                                <Text style={styles.tipoFactor}>Factor: x{tipo.factor_conversion}</Text>
                            </View>
                            <View style={styles.stepperContainer}>
                                <TouchableOpacity 
                                    style={styles.stepperButton} 
                                    onPress={() => handleDecrement(tipo.id_tipo_produccion)}
                                >
                                    <Text style={styles.stepperButtonText}>-</Text>
                                </TouchableOpacity>
                                
                                <TextInput
                                    style={styles.cantidadInput}
                                    placeholder="0"
                                    placeholderTextColor={colors.textFaint}
                                    keyboardType="numeric"
                                    value={cantidades[tipoIdStr] || ''}
                                    onChangeText={(val) => handleCantidadChange(tipo.id_tipo_produccion, val)}
                                />
                                
                                <TouchableOpacity 
                                    style={styles.stepperButton} 
                                    onPress={() => handleIncrement(tipo.id_tipo_produccion)}
                                >
                                    <Text style={styles.stepperButtonText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}

                {/* Calculadora Dinámica Móvil */}
                <View style={styles.totalCard}>
                    <Text style={styles.totalLabel}>TOTAL CALCULADO</Text>
                    <Text style={styles.totalValue}>{calculateTotal()} HUEVOS</Text>
                    <Text style={styles.formulaText}>
                        Fórmula: (Paquete*300) + (Maple*30) + (Huevo*1)
                    </Text>
                </View>
            </View>

            <TouchableOpacity 
                style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator color={colors.onGold} />
                ) : (
                    <Text style={styles.saveButtonText}>CONFIRMAR Y GUARDAR</Text>
                )}
            </TouchableOpacity>
            
            <View style={{ height: 50 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.bg,
    },
    loadingText: {
        marginTop: 10,
        color: colors.gold,
        fontWeight: '700',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 25,
        paddingBottom: 22,
        backgroundColor: colors.panel,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    backButton: {
        marginBottom: 10,
    },
    backText: {
        color: colors.gold,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: colors.text,
    },
    formCard: {
        margin: 20,
        backgroundColor: colors.card,
        padding: 22,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    label: {
        fontSize: 11,
        color: colors.gold,
        marginBottom: 8,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    pickerContainer: {
        backgroundColor: colors.inputBg,
        borderRadius: radius.control,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    galponFijo: {
        backgroundColor: colors.inputBg,
        borderRadius: radius.control,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.goldBorder,
        padding: 16,
    },
    galponNombre: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    galponLote: {
        fontSize: 13,
        color: colors.gold,
        marginTop: 4,
        fontWeight: '600',
    },
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
    dateText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: 'bold',
    },
    changeText: {
        fontSize: 10,
        color: colors.gold,
        fontWeight: 'bold',
    },
    cantidadesSection: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.gold,
        marginBottom: 14,
        letterSpacing: 2,
    },
    cantidadRow: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: radius.card,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tipoInfo: {
        flex: 1,
    },
    tipoNombre: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    tipoFactor: {
        fontSize: 12,
        color: colors.textMuted,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepperButton: {
        width: 44,
        height: 44,
        backgroundColor: colors.inputBg,
        borderRadius: radius.control,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.goldBorder,
        marginHorizontal: 4,
    },
    stepperButtonText: {
        color: colors.gold,
        fontSize: 20,
        fontWeight: 'bold',
    },
    cantidadInput: {
        width: 60,
        height: 44,
        backgroundColor: colors.inputBg,
        borderRadius: radius.control,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.gold,
        borderWidth: 1,
        borderColor: colors.border,
    },
    totalCard: {
        marginTop: 10,
        padding: 22,
        borderRadius: radius.card,
        backgroundColor: colors.goldSoftBg,
        borderWidth: 1,
        borderColor: colors.gold,
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    totalLabel: {
        color: colors.gold,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        letterSpacing: 1,
    },
    totalValue: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.text,
    },
    formulaText: {
        fontSize: 10,
        color: colors.textFaint,
        marginTop: 10,
        fontStyle: 'italic',
    },
    saveButton: {
        marginHorizontal: 20,
        backgroundColor: colors.gold,
        padding: 18,
        borderRadius: radius.control,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#666',
        opacity: 0.6,
    },
    saveButtonText: {
        color: colors.onGold,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    }
});
