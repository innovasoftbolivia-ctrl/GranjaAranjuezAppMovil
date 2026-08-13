import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ActivityIndicator, BackHandler } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useFonts } from 'expo-font';
import { clearCatalogosCache } from './src/utils/catalogos';
import { colors } from './src/theme';
import { outfitFontMap, applyOutfitToAllText } from './src/fonts';

// Outfit para toda la app (igual que el panel web). Se parchea una sola vez.
applyOutfitToAllText();
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProduccionScreen from './src/screens/ProduccionScreen';
import MortalidadScreen from './src/screens/MortalidadScreen';
import InspeccionScreen from './src/screens/InspeccionScreen';
import HistorialScreen from './src/screens/HistorialScreen';
import ScanGalponScreen from './src/screens/ScanGalponScreen';
import { setAuthToken, setUnauthorizedHandler } from './src/config/api';

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [scannedGalpon, setScannedGalpon] = useState(null); // { id_galpon, nombre }
  const [entradaHecha, setEntradaHecha] = useState(false);      // inspección de entrada del turno hecha
  const [cerrandoSesion, setCerrandoSesion] = useState(false);  // pidiendo la inspección de salida
  const [activeScreen, setActiveScreen] = useState('home');
  const [isInitializing, setIsInitializing] = useState(true);
  const [fontsLoaded] = useFonts(outfitFontMap);

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

  // Sesión expirada / token revocado detectado por el interceptor de Axios:
  // limpia la sesión segura y devuelve al usuario al login. (C2)
  useEffect(() => {
    setUnauthorizedHandler(() => {
      SecureStore.deleteItemAsync('userToken').catch(() => {});
      SecureStore.deleteItemAsync('userData').catch(() => {});
      // Limpiar catálogos cacheados: si tras el 401 entra otro usuario, no debe
      // arrastrar los datos del anterior (doLogout ya lo hace en el cierre normal).
      clearCatalogosCache();
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setEntradaHecha(false);
      setCerrandoSesion(false);
      setActiveScreen('home');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Botón físico "atrás" de Android: dentro del área autenticada, vuelve al Home
  // en vez de cerrar la app. En Home / login / escaneo / inspección obligatoria
  // deja el comportamiento por defecto.
  useEffect(() => {
    const onBack = () => {
      if (token && entradaHecha && !cerrandoSesion && activeScreen !== 'home') {
        setActiveScreen('home');
        return true; // evento consumido
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [token, entradaHecha, cerrandoSesion, activeScreen]);

  const handleLoginSuccess = (userToken, userData) => {
    setAuthToken(userToken);
    setToken(userToken);
    setUser(userData);
    setActiveScreen('home');
  };

  // El botón "Cerrar sesión" NO cierra directo: primero exige la inspección de salida.
  const iniciarCierreSesion = () => {
    setCerrandoSesion(true);
  };

  // Cierre de sesión real (tras la inspección de salida). Reinicia todo el flujo.
  const doLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
    } catch (e) {
      console.error('Error en logout seguro:', e);
    }
    clearCatalogosCache();
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setScannedGalpon(null);
    setEntradaHecha(false);
    setCerrandoSesion(false);
    setActiveScreen('home');
  };

  // Vuelve al escaneo para elegir otro galpón (obliga a una nueva inspección de entrada).
  const handleChangeGalpon = () => {
    setActiveScreen('home');
    setEntradaHecha(false);
    setScannedGalpon(null);
  };

  const renderScreen = () => {
    if (isInitializing || !fontsLoaded) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.gold} />
                <Text style={{ color: colors.textMuted, marginTop: 10 }}>Verificando Seguridad...</Text>
            </View>
        );
    }

    // Paso 1: al abrir la app SIEMPRE se escanea el QR del galpón.
    if (!scannedGalpon) {
        return <ScanGalponScreen onScanned={setScannedGalpon} />;
    }

    // Paso 2: autenticación (la sesión se recuerda entre aperturas).
    if (!token) {
        return <LoginScreen onLoginSuccess={handleLoginSuccess} galpon={scannedGalpon} />;
    }

    // Paso 3: para CERRAR SESIÓN se exige primero una inspección de salida.
    if (cerrandoSesion) {
        return (
            <InspeccionScreen
                galpon={scannedGalpon}
                modo="salida"
                onCompleted={doLogout}
                onCancel={() => setCerrandoSesion(false)}
            />
        );
    }

    // Paso 4: al iniciar el turno se exige obligatoriamente una inspección de entrada.
    if (!entradaHecha) {
        return (
            <InspeccionScreen
                galpon={scannedGalpon}
                modo="entrada"
                onCompleted={() => { setEntradaHecha(true); setActiveScreen('home'); }}
                onCancel={handleChangeGalpon}
            />
        );
    }

    // Paso 5: la app queda fijada al galpón escaneado.
    switch (activeScreen) {
        case 'home':
            return (
                <HomeScreen
                    user={user}
                    galpon={scannedGalpon}
                    onNavigate={setActiveScreen}
                    onLogout={iniciarCierreSesion}
                    onChangeGalpon={handleChangeGalpon}
                />
            );
        case 'produccion':
            return <ProduccionScreen onBack={() => setActiveScreen('home')} galpon={scannedGalpon} />;
        case 'mortalidad':
            return <MortalidadScreen onBack={() => setActiveScreen('home')} galpon={scannedGalpon} />;
        case 'historial':
            return <HistorialScreen onBack={() => setActiveScreen('home')} user={{...user, token}} galpon={scannedGalpon} />;
        default:
            return <HomeScreen user={user} galpon={scannedGalpon} onNavigate={setActiveScreen} onLogout={iniciarCierreSesion} onChangeGalpon={handleChangeGalpon} />;
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
    backgroundColor: colors.bg,
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
