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

export default function MortalidadScreen({ onBack }) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Catalogos
    const [galpones, setGalpones] = useState([]);
    const [encargados, setEncargados] = useState([]);
    const [tiposMortalidad, setTiposMortalidad] = useState([]);

    // Form State
    const [idGalpon, setIdGalpon] = useState('');
    const [idEncargado, setIdEncargado] = useState('');
    const [fecha, setFecha] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [cantidades, setCantidades] = useState({});

    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        fetchCatalogos();

        // Escuchar cambios de conexión
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
            const response = await api.get('/catalogos'); // El endpoint de mortalidad también tiene catalogos
            setGalpones(response.data.galpones);
            setEncargados(response.data.encargados);
            setTiposMortalidad(response.data.tipos_mortalidad);
            
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

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setFecha(selectedDate);
        }
    };

    const handleSubmit = async () => {
        if (!idGalpon || !idEncargado) {
            Alert.alert('Error', 'Completa Galpón y Encargado');
            return;
        }

        const validCantidades = Object.keys(cantidades).filter(key => parseInt(cantidades[key]) > 0);
        if (validCantidades.length === 0) {
            Alert.alert('Error', 'Ingresa al menos una baja por mortalidad');
            return;
        }

        setSubmitting(true);
        try {
            const localDate = fecha.getFullYear() + '-' + 
                               String(fecha.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(fecha.getDate()).padStart(2, '0');

            const payload = {
                id_galpon: idGalpon,
                id_encargado: idEncargado,
                fecha: localDate,
                cantidades: cantidades
            };

            const response = await api.post('/mortalidad', payload);
            Alert.alert('Éxito', response.data.message);
            onBack(); 
        } catch (error) {
            if (!error.response || error.code === 'ERR_NETWORK') {
                const localDate = fecha.getFullYear() + '-' + 
                                   String(fecha.getMonth() + 1).padStart(2, '0') + '-' + 
                                   String(fecha.getDate()).padStart(2, '0');

                const payload = {
                    id_galpon: idGalpon,
                    id_encargado: idEncargado,
                    fecha: localDate,
                    cantidades: cantidades
                };
                
                const saved = await addToQueue('/mortalidad', payload, 'MORTALIDAD');
                if (saved) {
                    Alert.alert(
                        'Modo Offline',
                        'Sin conexión. Registro de mortalidad guardado localmente.',
                        [{ text: 'Entendido', onPress: onBack }]
                    );
                }
            } else {
                const msg = error.response?.data?.message || 'Error al guardar registro';
                Alert.alert('Error', msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#009ef7" />
                <Text style={styles.loadingText}>Cargando datos...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backText}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Registrar Mortalidad</Text>
            </View>

            <View style={styles.formCard}>
                <Text style={styles.label}>Galpón / Ubicación</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        style={{ color: '#fff' }}
                        dropdownIconColor="#fff"
                        selectedValue={idGalpon}
                        onValueChange={(itemValue) => setIdGalpon(itemValue)}
                    >
                        {galpones?.map(g => (
                            <Picker.Item key={g.id_galpon} label={`${g.nombre} (${g.ubicacion})`} value={g.id_galpon.toString()} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Fecha</Text>
                <TouchableOpacity 
                    style={styles.dateSelector} 
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text style={styles.dateText}>{fecha.toLocaleDateString()}</Text>
                    <Text style={styles.dateHint}>Cambiar fecha</Text>
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        value={fecha}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                    />
                )}

                <Text style={styles.label}>Encargado del Registro</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        style={{ color: '#fff' }}
                        dropdownIconColor="#fff"
                        selectedValue={idEncargado}
                        onValueChange={(itemValue) => setIdEncargado(itemValue)}
                    >
                        {encargados?.map(e => (
                            <Picker.Item key={e.id_encargado} label={e.nombre} value={e.id_encargado.toString()} />
                        ))}
                    </Picker>
                </View>
            </View>

            <View style={styles.cantidadesSection}>
                <Text style={styles.sectionTitle}>Bajas por Causa</Text>
                {tiposMortalidad?.map(tipo => (
                    <View key={tipo.id_tipo_mortalidad} style={styles.cantidadRow}>
                        <View style={styles.tipoInfo}>
                            <Text style={styles.tipoNombre}>{tipo.nombre}</Text>
                        </View>
                        <TextInput
                            style={styles.cantidadInput}
                            placeholder="0"
                            keyboardType="numeric"
                            value={cantidades[tipo.id_tipo_mortalidad.toString()] || ''}
                            onChangeText={(val) => handleCantidadChange(tipo.id_tipo_mortalidad, val)}
                        />
                    </View>
                ))}
            </View>

            <TouchableOpacity 
                style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveButtonText}>Guardar Mortalidad</Text>
                )}
            </TouchableOpacity>
            
            <View style={{ height: 50 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f15',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f0f15',
    },
    loadingText: {
        marginTop: 10,
        color: '#8e8f9e',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 25,
        paddingBottom: 25,
        backgroundColor: '#13131a',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.02)'
    },
    backButton: {
        marginBottom: 10,
    },
    backText: {
        color: '#009ef7',
        fontWeight: 'bold',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    formCard: {
        margin: 20,
        backgroundColor: '#181822',
        padding: 24,
        borderRadius: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    label: {
        fontSize: 14,
        color: '#8e8f9e',
        marginBottom: 8,
        fontWeight: '500',
    },
    pickerContainer: {
        backgroundColor: '#121219',
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    dateSelector: {
        backgroundColor: '#121219',
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    dateText: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: 'bold',
    },
    dateHint: {
        fontSize: 12,
        color: '#009ef7',
    },
    cantidadesSection: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 15,
        marginLeft: 4,
    },
    cantidadRow: {
        backgroundColor: '#181822',
        padding: 18,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    tipoInfo: {
        flex: 1,
    },
    tipoNombre: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    cantidadInput: {
        width: 80,
        height: 50,
        backgroundColor: '#121219',
        borderRadius: 14,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f1416c',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    saveButton: {
        marginHorizontal: 20,
        backgroundColor: '#009ef7',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#009ef7',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    saveButtonDisabled: {
        backgroundColor: '#0095e8',
        opacity: 0.5,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    }
});
