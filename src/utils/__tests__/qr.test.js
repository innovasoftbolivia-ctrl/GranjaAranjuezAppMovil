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

    it('rechaza texto arbitrario, números sueltos y vacío', () => {
        expect(parseGalponQR('hola mundo')).toBeNull();
        expect(parseGalponQR('42')).toBeNull();
        expect(parseGalponQR('')).toBeNull();
        expect(parseGalponQR(null)).toBeNull();
    });
});
