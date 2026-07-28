import React, { useState, useEffect } from 'react';
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
import { addToQueue, syncOfflineData } from '../utils/SyncManager';

export default function ProduccionScreen({ onBack }) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Catalogos
    const [galpones, setGalpones] = useState([]);
    const [encargados, setEncargados] = useState([]);
    const [tiposProduccion, setTiposProduccion] = useState([]);

    // Form State
    const [idGalpon, setIdGalpon] = useState('');
    const [idEncargado, setIdEncargado] = useState('');
    const [fecha, setFecha] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [cantidades, setCantidades] = useState({});

    const [isOffline, setIsOffline] = useState(false);

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
            const response = await api.get('/catalogos');
            setGalpones(response.data.galpones);
            setEncargados(response.data.encargados);
            setTiposProduccion(response.data.tipos_produccion);
            if (response.data.galpones.length > 0) setIdGalpon(response.data.galpones[0].id_galpon.toString());
            if (response.data.encargados.length > 0) setIdEncargado(response.data.encargados[0].id_encargado.toString());
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
        const validCantidades = Object.keys(cantidades).filter(key => parseInt(cantidades[key]) > 0);
        if (validCantidades.length === 0) {
            Alert.alert('Error', 'Ingresa al menos una cantidad');
            return;
        }

        setSubmitting(true);
        try {
            const localDate = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
            const payload = { id_galpon: idGalpon, id_encargado: idEncargado, fecha: localDate, cantidades: cantidades };
            const response = await api.post('/produccion', payload);
            Alert.alert('Éxito', response.data.message);
            onBack();
        } catch (error) {
            // Error handling remains same...
            const msg = error.response?.data?.message || 'Error al guardar';
            Alert.alert('Error', msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D9B300" />
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
                <Text style={styles.label}>GALPÓN DESTINO</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        style={{ color: '#fff' }}
                        dropdownIconColor="#D9B300"
                        selectedValue={idGalpon}
                        onValueChange={(itemValue) => setIdGalpon(itemValue)}
                    >
                        {galpones?.map(g => (
                            <Picker.Item key={g.id_galpon} label={`${g.nombre}`} value={g.id_galpon.toString()} />
                        ))}
                    </Picker>
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
                {tiposProduccion?.map(tipo => (
                    <View key={tipo.id_tipo_produccion} style={styles.cantidadRow}>
                        <View style={styles.tipoInfo}>
                            <Text style={styles.tipoNombre}>{tipo.nombre}</Text>
                            <Text style={styles.tipoFactor}>Factor: x{tipo.factor_conversion}</Text>
                        </View>
                        <TextInput
                            style={styles.cantidadInput}
                            placeholder="0"
                            placeholderTextColor="#444"
                            keyboardType="numeric"
                            value={cantidades[tipo.id_tipo_produccion.toString()] || ''}
                            onChangeText={(val) => handleCantidadChange(tipo.id_tipo_produccion, val)}
                        />
                    </View>
                ))}

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
                    <ActivityIndicator color="#000" />
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
        backgroundColor: '#000000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
    loadingText: {
        marginTop: 10,
        color: '#D9B300',
        fontWeight: '700',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 25,
        paddingBottom: 25,
        backgroundColor: '#050505',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        borderBottomWidth: 1,
        borderColor: 'rgba(217, 179, 0, 0.2)'
    },
    backButton: {
        marginBottom: 10,
    },
    backText: {
        color: '#D9B300',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    formCard: {
        margin: 20,
        backgroundColor: '#080808',
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    label: {
        fontSize: 11,
        color: '#D9B300',
        marginBottom: 8,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    pickerContainer: {
        backgroundColor: '#000',
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(217, 179, 0, 0.1)',
    },
    dateSelector: {
        backgroundColor: '#000',
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(217, 179, 0, 0.1)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: 'bold',
    },
    changeText: {
        fontSize: 10,
        color: '#D9B300',
        fontWeight: 'bold',
    },
    cantidadesSection: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#D9B300',
        marginBottom: 15,
        letterSpacing: 2,
    },
    cantidadRow: {
        backgroundColor: '#0a0a0a',
        padding: 20,
        borderRadius: 22,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    tipoInfo: {
        flex: 1,
    },
    tipoNombre: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    tipoFactor: {
        fontSize: 12,
        color: '#444',
    },
    cantidadInput: {
        width: 90,
        height: 54,
        backgroundColor: '#000',
        borderRadius: 15,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: 'bold',
        color: '#D9B300',
        borderWidth: 1,
        borderColor: 'rgba(217, 179, 0, 0.2)',
    },
    totalCard: {
        marginTop: 10,
        padding: 25,
        borderRadius: 24,
        backgroundColor: 'rgba(217, 179, 0, 0.05)',
        borderWidth: 1,
        borderColor: '#D9B300',
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    totalLabel: {
        color: '#D9B300',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        letterSpacing: 1,
    },
    totalValue: {
        fontSize: 28,
        fontWeight: '900',
        color: '#ffffff',
    },
    formulaText: {
        fontSize: 10,
        color: '#444',
        marginTop: 10,
        fontStyle: 'italic',
    },
    saveButton: {
        marginHorizontal: 20,
        backgroundColor: '#D9B300',
        padding: 22,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#D9B300',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    saveButtonDisabled: {
        backgroundColor: '#666',
        shadowOpacity: 0,
    },
    saveButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    }
});
