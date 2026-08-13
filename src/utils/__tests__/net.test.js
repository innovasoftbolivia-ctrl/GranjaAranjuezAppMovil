import { isNetworkError } from '../net';

describe('isNetworkError', () => {
    it('es true cuando no hay respuesta del servidor (fallo de red)', () => {
        expect(isNetworkError({})).toBe(true);
        expect(isNetworkError({ message: 'Network Error' })).toBe(true);
        expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true);
        expect(isNetworkError({ code: 'ECONNABORTED' })).toBe(true); // timeout
    });

    it('es false cuando el servidor sí respondió (hay response)', () => {
        expect(isNetworkError({ response: { status: 422 } })).toBe(false);
        expect(isNetworkError({ response: { status: 500 } })).toBe(false);
    });
});
