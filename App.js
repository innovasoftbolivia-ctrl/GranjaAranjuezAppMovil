import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProduccionScreen from './src/screens/ProduccionScreen';
import MortalidadScreen from './src/screens/MortalidadScreen';
import HistorialScreen from './src/screens/HistorialScreen';
import api, { setAuthToken, setOnUnauthorized } from './src/config/api';

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [activeScreen, setActiveScreen] = useState('home');
  const [isInitializing, setIsInitializing] = useState(true);

  // Carga inicial de sesión segura desde el hardware del dispositivo
  useEffect(() => {
    async function loadStoredCredentials() {
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');
        const storedUser = await SecureStore.getItemAsync('userData');
        
        if (storedToken && storedUser) {
          setAuthToken(storedToken);
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Error cargando seguridad:', e);
      } finally {
        setIsInitializing(false);
      }
    }
    loadStoredCredentials();
  }, []);

  const handleLoginSuccess = (userToken, userData) => {
    setAuthToken(userToken);
    setToken(userToken);
    setUser(userData);
    setActiveScreen('home');
  };

  const handleLogout = async () => {
    // Revocar el token en el servidor; si no hay conexión, igual se cierra la sesión local
    try {
      await api.post('logout');
    } catch (e) {
      console.warn('No se pudo revocar el token en el servidor:', e.message);
    }
    await clearLocalSession();
  };

  const clearLocalSession = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
      setAuthToken(null);
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error('Error en logout seguro:', e);
    }
  };

  // Si el servidor responde 401 (token expirado o revocado), volver al login
  useEffect(() => {
    setOnUnauthorized(clearLocalSession);
  }, []);

  const renderScreen = () => {
    if (isInitializing) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#009ef7" />
                <Text style={{ color: '#8e8f9e', marginTop: 10 }}>Verificando Seguridad...</Text>
            </View>
        );
    }

    if (!token) {
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    switch (activeScreen) {
        case 'home':
            return (
                <HomeScreen 
                    user={user} 
                    onNavigate={setActiveScreen} 
                    onLogout={handleLogout} 
                />
            );
        case 'produccion':
            return <ProduccionScreen onBack={() => setActiveScreen('home')} />;
        case 'mortalidad':
            return <MortalidadScreen onBack={() => setActiveScreen('home')} />;
        case 'historial':
            return <HistorialScreen onBack={() => setActiveScreen('home')} user={{...user, token}} />;
        default:
            return <HomeScreen user={user} onNavigate={setActiveScreen} onLogout={handleLogout} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  dashboard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F7F9FC',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 10,
  },
  successText: {
    fontSize: 16,
    color: '#00B894',
    textAlign: 'center',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    fontStyle: 'italic',
  }
});
