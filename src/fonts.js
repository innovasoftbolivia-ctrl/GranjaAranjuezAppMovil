// Carga de la fuente Outfit (la misma del panel web) y aplicación global.
//
// En React Native cada peso de Outfit es una familia distinta, y <Text> no
// hereda la fuente de forma global. Además React 19 quitó `defaultProps` en
// componentes de función, así que el patrón fiable es interceptar el render de
// Text una sola vez y mapear su `fontWeight` a la variante correcta de Outfit.

import { Text, StyleSheet } from 'react-native';
// Import por subruta (no desde el barrel) para empaquetar SOLO estos 4 pesos
// y no las 9 variantes de Outfit.
import Outfit_400Regular from '@expo-google-fonts/outfit/400Regular/Outfit_400Regular.ttf';
import Outfit_500Medium from '@expo-google-fonts/outfit/500Medium/Outfit_500Medium.ttf';
import Outfit_600SemiBold from '@expo-google-fonts/outfit/600SemiBold/Outfit_600SemiBold.ttf';
import Outfit_700Bold from '@expo-google-fonts/outfit/700Bold/Outfit_700Bold.ttf';

// Mapa de pesos que se pasa a useFonts() en App.js.
export const outfitFontMap = {
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
};

// fontWeight (numérico o keyword) → familia Outfit cargada.
export function outfitFamilyForWeight(weight) {
    const w = String(weight == null ? '400' : weight);
    if (w === 'bold' || w === '700' || w === '800' || w === '900') return 'Outfit_700Bold';
    if (w === '600') return 'Outfit_600SemiBold';
    if (w === '500') return 'Outfit_500Medium';
    return 'Outfit_400Regular'; // 'normal', '100'–'400', o sin especificar
}

// Aplica Outfit a TODOS los <Text> de la app (una sola vez).
let patched = false;
export function applyOutfitToAllText() {
    if (patched || !Text || typeof Text.render !== 'function') return;
    patched = true;

    const originalRender = Text.render;
    Text.render = function (...args) {
        const el = originalRender.apply(this, args);
        // StyleSheet.flatten aplana arrays anidados y resuelve IDs de estilo, así
        // que el fontWeight se lee de forma robusta (un Object.assign de un solo
        // nivel fallaría con style={[a, [b, c]]}).
        const flat = StyleSheet.flatten(el.props.style) || {};
        const fontFamily = outfitFamilyForWeight(flat.fontWeight);
        // La familia base va primero; los estilos propios de cada Text mandan
        // por encima (ninguno define fontFamily, así que Outfit prevalece).
        return {
            ...el,
            props: {
                ...el.props,
                style: [{ fontFamily }, el.props.style],
            },
        };
    };
}
