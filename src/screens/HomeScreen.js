import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';

export default function HomeScreen({ user, onNavigate, onLogout }) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.welcome}>¡Hola, {user?.name.split(' ')[0]}!</Text>
                        <Text style={styles.subtitle}>Granja AA • Gestión Privada</Text>
                    </View>
                    <Image 
                        source={require('../../assets/logo.png')} 
                        style={styles.logoHeader}
                        resizeMode="contain"
                    />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.menuArea}>
                <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('produccion')}>
                    <View style={[styles.glowBackground, { backgroundColor: 'rgba(217, 179, 0, 0.12)' }]} />
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(217, 179, 0, 0.15)', borderColor: 'rgba(217, 179, 0, 0.3)' }]}>
                            <Text style={styles.icon}>🥚</Text>
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.menuTitle}>Producción</Text>
                            <Text style={styles.menuDesc}>Control de recolección diaria</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('mortalidad')}>
                    <View style={[styles.glowBackground, { backgroundColor: 'rgba(255, 255, 255, 0.03)' }]} />
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                            <Text style={styles.icon}>💀</Text>
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.menuTitle}>Mortalidad</Text>
                            <Text style={styles.menuDesc}>Reportes y cálculo de bajas</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('historial')}>
                    <View style={[styles.glowBackground, { backgroundColor: 'rgba(217, 179, 0, 0.05)' }]} />
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(217, 179, 0, 0.08)', borderColor: 'rgba(217, 179, 0, 0.15)' }]}>
                            <Text style={styles.icon}>📋</Text>
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.menuTitle}>Actividad</Text>
                            <Text style={styles.menuDesc}>Bitácora de los últimos 15 días</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
                    <Text style={styles.logoutText}>Finalizar Sesión Activa</Text>
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
        backgroundColor: '#000000',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 30,
        paddingBottom: 40,
        backgroundColor: '#050505',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        borderBottomWidth: 1,
        borderColor: 'rgba(217, 179, 0, 0.15)',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcome: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 14,
        color: '#D9B300',
        marginTop: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    logoHeader: {
        width: 60,
        height: 60,
        borderRadius: 15,
        backgroundColor: 'rgba(217, 179, 0, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(217, 179, 0, 0.1)',
    },
    menuArea: {
        padding: 25,
        paddingTop: 35,
    },
    menuCard: {
        borderRadius: 28,
        padding: 22,
        marginBottom: 20,
        backgroundColor: '#0a0a0a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
    },
    glowBackground: {
        position: 'absolute',
        top: -50,
        left: -50,
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 18,
        borderWidth: 1,
    },
    icon: {
        fontSize: 30,
    },
    textContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 2,
    },
    menuDesc: {
        fontSize: 13,
        color: '#8e8f9e',
    },
    logoutButton: {
        marginTop: 30,
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    logoutText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 16,
        opacity: 0.6,
    },
    footer: {
        marginTop: 40,
        paddingBottom: 20,
        alignItems: 'center',
    },
    footerText: {
        color: '#333',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    }
});
