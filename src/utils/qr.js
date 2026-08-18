// Interpreta el contenido de un QR de galpón. Función pura (sin dependencias
// nativas) para poder testearla fácilmente. Acepta:
//   - JSON: {"app":"granja-aa","id_galpon":3,"nombre":"Galpón 3"}
//   - URI:  granja-aa://galpon/3
//   - URL:  https://elservidor/galpon/3   (la que imprime el panel web)
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

    // La etiqueta que imprime el panel web lleva la URL de la ficha del galpón.
    // Así un solo código pegado en la puerta sirve para los dos caminos: con la
    // cámara del celular abre la ficha en el navegador, y con esta app entra
    // directo al galpón.
    //
    // No se valida el host a propósito. El QR es un identificador, no un destino
    // de navegación —la app siempre pega contra su propia API—, y atarlo al
    // dominio dejaría muertas las etiquetas ya impresas en cuanto cambie el
    // túnel de ngrok. Sí se exige que /galpon/<id> cierre la ruta, para no
    // confundirla con /galpon/<id>/qr, que es la pantalla de impresión.
    const url = text.match(/^https?:\/\/\S+?\/galpon\/(\d+)\/?(?:[?#]\S*)?$/i);
    if (url) {
        return { id_galpon: Number(url[1]), nombre: `Galpón ${url[1]}` };
    }

    return null;
}
