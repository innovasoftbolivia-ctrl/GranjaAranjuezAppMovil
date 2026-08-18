import { parseGalponQR } from '../qr';

describe('parseGalponQR', () => {
    it('parsea el formato JSON de la app', () => {
        const r = parseGalponQR('{"app":"granja-aa","id_galpon":3,"nombre":"Galpón 3"}');
        expect(r).toEqual({ id_galpon: 3, nombre: 'Galpón 3' });
    });

    it('usa un nombre por defecto si el JSON no lo trae', () => {
        const r = parseGalponQR('{"app":"granja-aa","id_galpon":7}');
        expect(r).toEqual({ id_galpon: 7, nombre: 'Galpón 7' });
    });

    it('parsea el formato URI granja-aa://galpon/N', () => {
        expect(parseGalponQR('granja-aa://galpon/5')).toEqual({ id_galpon: 5, nombre: 'Galpón 5' });
    });

    it('rechaza un QR de otra app', () => {
        expect(parseGalponQR('{"app":"otra","id_galpon":1}')).toBeNull();
    });

    // La etiqueta impresa desde el panel web lleva la URL de la ficha del galpón.
    describe('la URL que imprime el panel web', () => {
        it('parsea la ficha del galpón', () => {
            expect(parseGalponQR('http://localhost/galpon/1')).toEqual({ id_galpon: 1, nombre: 'Galpón 1' });
            expect(parseGalponQR('https://granja.example.com/galpon/12')).toEqual({ id_galpon: 12, nombre: 'Galpón 12' });
        });

        it('tolera subcarpeta, barra final y parámetros', () => {
            expect(parseGalponQR('https://host/sistema/galpon/4')).toEqual({ id_galpon: 4, nombre: 'Galpón 4' });
            expect(parseGalponQR('https://host/galpon/4/')).toEqual({ id_galpon: 4, nombre: 'Galpón 4' });
            expect(parseGalponQR('https://host/galpon/4?ref=qr')).toEqual({ id_galpon: 4, nombre: 'Galpón 4' });
        });

        it('no confunde la pantalla de impresión con la ficha', () => {
            expect(parseGalponQR('https://host/galpon/4/qr')).toBeNull();
            expect(parseGalponQR('https://host/galpon/4/qr/png')).toBeNull();
        });

        it('rechaza otras rutas del panel', () => {
            expect(parseGalponQR('https://host/galpones/4')).toBeNull();
            expect(parseGalponQR('https://host/lote/4')).toBeNull();
            expect(parseGalponQR('https://host/galpon/')).toBeNull();
            expect(parseGalponQR('https://host/galpon/abc')).toBeNull();
        });

        it('exige que sea una URL, no un texto que la contenga', () => {
            expect(parseGalponQR('mira esto: https://host/galpon/4')).toBeNull();
            expect(parseGalponQR('ftp://host/galpon/4')).toBeNull();
        });
    });

    it('rechaza texto arbitrario, números sueltos y vacío', () => {
        expect(parseGalponQR('hola mundo')).toBeNull();
        expect(parseGalponQR('42')).toBeNull();
        expect(parseGalponQR('')).toBeNull();
        expect(parseGalponQR(null)).toBeNull();
    });
});
