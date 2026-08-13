// Interpreta el contenido de un QR de galpón. Función pura (sin dependencias
// nativas) para poder testearla fácilmente. Acepta:
//   - JSON: {"app":"granja-aa","id_galpon":3,"nombre":"Galpón 3"}
//   - URI:  granja-aa://galpon/3
// Devuelve { id_galpon, nombre } o null si el QR no es de la app.
export function parseGalponQR(raw) {
    if (!raw) return null;
    const text = String(raw).trim();

    try {
        const obj = JSON.parse(text);
        if (obj && obj.app === 'granja-aa' && obj.id_galpon != null) {
            // Validar que sea un entero positivo: un id "abc" pasaba el != null y
            // se propagaba como Number(...) = NaN → "NaN" en los payloads.
            const id = Number(obj.id_galpon);
            if (!Number.isInteger(id) || id <= 0) return null;
            return {
                id_galpon: id,
                nombre: obj.nombre ?? `Galpón ${id}`,
            };
        }
    } catch (_) {
        // no era JSON; probamos el formato URI
    }

    const m = text.match(/^granja-aa:\/\/galpon\/(\d+)$/i);
    if (m) {
        return { id_galpon: Number(m[1]), nombre: `Galpón ${m[1]}` };
    }

    return null;
}
