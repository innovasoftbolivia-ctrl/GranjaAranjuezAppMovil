// Sistema de diseño único de la app móvil.
// Refleja el tema oscuro del panel web (resources/views/layouts/app.blade.php):
// fondo #0b0c0f, tarjetas #16171d, acento dorado #D9B300, bordes sutiles,
// esquinas moderadas (14/10 px) y superficies planas (sin sombras marcadas).
// Un único acento dorado en toda la app (se eliminó el azul #009ef7 heredado).

export const colors = {
    // Superficies
    bg: '#0b0c0f',            // fondo general (--bg-dark)
    card: '#16171d',          // tarjetas (--card-bg)
    panel: '#0e0f13',         // cabeceras / topbar / sidebar (--sidebar-bg)
    headBg: 'rgba(255, 255, 255, 0.03)', // fondos tenues (encabezados, addons)
    inputBg: 'rgba(0, 0, 0, 0.25)',      // inputs (--input-bg)

    // Acento dorado (único de la marca)
    gold: '#D9B300',                       // --primary-gold / --gold-ink
    goldHover: '#c4a200',
    goldSoft: 'rgba(217, 179, 0, 0.15)',   // --accent-glow / relleno de íconos
    goldSoftBg: 'rgba(217, 179, 0, 0.12)',
    goldBorder: 'rgba(217, 179, 0, 0.35)',

    // Bordes
    border: 'rgba(255, 255, 255, 0.10)',       // --border-light
    borderHover: 'rgba(255, 255, 255, 0.16)',  // --card-hover-border

    // Texto
    text: '#f2f2f5',        // --text-body
    textMuted: '#a9aab4',   // --text-muted
    textFaint: '#6b6d76',   // pistas muy tenues (nunca #333/#222: invisibles)
    onGold: '#141414',      // texto sobre relleno dorado (botones)

    // Semánticos (idénticos a los badges del panel web)
    success: '#34d399',
    successSoft: 'rgba(52, 211, 153, 0.15)',
    successBorder: 'rgba(52, 211, 153, 0.45)',
    danger: '#f87171',
    dangerSoft: 'rgba(248, 113, 113, 0.15)',
    dangerBorder: 'rgba(248, 113, 113, 0.45)',
    info: '#31d2f2',
    orange: '#fd7e14',
};

// Radios: el panel web usa 14 px en tarjetas y 10 px en controles (estilo
// empresarial plano). Se abandonan los 20–40 px que tenía la app.
export const radius = {
    control: 10,   // inputs, botones, selectores
    chip: 12,      // píldoras, íconos, celdas pequeñas
    card: 14,      // tarjetas y contenedores
    pill: 999,     // badges
};

export const spacing = {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
};

// Sombra tenue y uniforme (el panel web es plano: box-shadow: none).
// Se deja casi imperceptible solo para separar la CTA principal del fondo.
export const softShadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
};

export default { colors, radius, spacing, softShadow };
