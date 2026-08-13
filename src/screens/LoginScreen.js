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
import { colors, radius } from '../theme';

export default function LoginScreen({ onLoginSuccess, galpon }) {
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
                email: email.trim(),
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
                const status = error.response.status;
                // El backend (AuthController) responde 401/422 con credenciales
                // incorrectas. (A1)
                if (status === 401 || status === 422) {
                    title = 'Credenciales Inválidas';
                    message = 'Los datos ingresados no coinciden con nuestros registros. Verifica tu correo y contraseña.';
                } else if (status === 404) {
                    // 404 NO es credenciales: es que la app no encontró el
                    // endpoint (URL de la API mal configurada o backend caído).
                    title = 'Servicio no encontrado';
                    message = 'La app no encontró el servicio de login (HTTP 404). Revisa que EXPO_PUBLIC_API_URL en .env apunte a un backend activo.';
                } else if (status === 429) {
                    // Rate limit del login (throttle:5,1 en el servidor). (A1)
                    title = 'Demasiados intentos';
                    message = 'Has superado el número de intentos permitidos. Espera un minuto e inténtalo de nuevo.';
                } else {
                    message = `Error ${status}: ${error.response.data?.message || 'Error interno del servidor'}`;
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
                    {galpon && (
                        <View style={styles.galponBadge}>
                            <Text style={styles.galponBadgeText}>📍 {galpon.nombre}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.formContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Correo Electrónico"
                        placeholderTextColor={colors.textFaint}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Contraseña"
                        placeholderTextColor={colors.textFaint}
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
                            <ActivityIndicator color={colors.onGold} />
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
        backgroundColor: colors.bg,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        padding: 28,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 44,
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: radius.card,
        backgroundColor: colors.goldSoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.goldBorder,
    },
    logoImage: {
        width: 92,
        height: 92,
        borderRadius: radius.chip,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: colors.text,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 12,
        color: colors.gold,
        marginTop: 6,
        letterSpacing: 2,
        fontWeight: '700',
    },
    galponBadge: {
        marginTop: 16,
        backgroundColor: colors.goldSoft,
        borderWidth: 1,
        borderColor: colors.goldBorder,
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: radius.pill,
    },
    galponBadgeText: {
        color: colors.gold,
        fontWeight: 'bold',
        fontSize: 14,
    },
    formContainer: {
        backgroundColor: colors.card,
        padding: 24,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    input: {
        height: 56,
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.control,
        marginBottom: 16,
        fontSize: 16,
        color: colors.text,
        paddingHorizontal: 16,
    },
    button: {
        backgroundColor: colors.gold,
        height: 56,
        borderRadius: radius.control,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: colors.onGold,
        fontSize: 17,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    footer: {
        textAlign: 'center',
        marginTop: 60,
        color: colors.textFaint,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    }
});
