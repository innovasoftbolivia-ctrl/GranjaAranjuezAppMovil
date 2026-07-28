import React, { useState } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    TextInput, 
    TouchableOpacity, 
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image
} from 'react-native';
import api from '../config/api';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor ingresa todos los campos');
            return;
        }

        setLoading(true);
        try {
            console.log('Intentando login en:', api.defaults.baseURL);
            
            const response = await api.post('/login', {
                email: email,
                password: password,
                device_name: Platform.OS + ' ' + Platform.Version
            });

            // Si llegamos aquí, el servidor respondió con 2xx
            if (response.data && response.data.token && response.data.user) {
                const { token, user } = response.data;
                await SecureStore.setItemAsync('userToken', token);
                await SecureStore.setItemAsync('userData', JSON.stringify(user));
                onLoginSuccess(token, user);
            } else {
                throw new Error('La respuesta del servidor no contiene los datos de sesión esperados.');
            }

        } catch (error) {
            console.error('Error detallado:', error);
            let message = 'Error de conexión';
            let title = 'Error';

            if (error.response) {
                // El servidor respondió (401, 404, 500, etc)
                if (error.response.status === 401 || error.response.status === 404) {
                    title = 'Credenciales Inválidas';
                    message = 'Los datos ingresados no coinciden con nuestros registros. Verifica tu correo y contraseña.';
                } else {
                    message = `Error ${error.response.status}: ${error.response.data?.message || 'Error interno del servidor'}`;
                }
            } else if (error.request) {
                // Timeout o Red caída
                title = 'Servidor no Alcanzado';
                message = 'No pudimos conectar con el servidor. Revisa:\n1. Que tu PC e internet estén activos.\n2. Que el servidor Laravel esté corriendo.';
            } else {
                message = error.message;
            }
            
            Alert.alert(title, message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.container}
        >
            <View style={styles.inner}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Image 
                            source={require('../../assets/logo.png')} 
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.title}>Granja AA</Text>
                    <Text style={styles.subtitle}>GESTIÓN PRIVADA • ACCESO</Text>
                </View>

                <View style={styles.formContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Correo Electrónico"
                        placeholderTextColor="#555"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Contraseña"
                        placeholderTextColor="#555"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TouchableOpacity 
                        style={styles.button} 
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.buttonText}>Entrar al Sistema</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>SISTEMA DE GESTIÓN AVÍCOLA AA</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        padding: 30,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 50,
    },
    logoCircle: {
        width: 130,
        height: 130,
        borderRadius: 40,
        backgroundColor: 'rgba(217, 179, 0, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(217, 179, 0, 0.2)',
    },
    logoImage: {
        width: 100,
        height: 100,
        borderRadius: 20,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 12,
        color: '#D9B300',
        marginTop: 6,
        letterSpacing: 2,
        fontWeight: '700',
    },
    formContainer: {
        backgroundColor: '#050505',
        padding: 30,
        borderRadius: 35,
        borderWidth: 1,
        borderColor: 'rgba(217, 179, 0, 0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
    },
    input: {
        height: 64,
        backgroundColor: '#0c0c0c',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        borderRadius: 20,
        marginBottom: 20,
        fontSize: 16,
        color: '#ffffff',
        paddingHorizontal: 22,
    },
    button: {
        backgroundColor: '#D9B300',
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#D9B300',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    buttonText: {
        color: '#000000',
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    footer: {
        textAlign: 'center',
        marginTop: 70,
        color: '#222',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    }
});
