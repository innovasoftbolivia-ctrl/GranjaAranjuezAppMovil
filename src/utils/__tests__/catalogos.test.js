import { getCatalogos, clearCatalogosCache } from '../catalogos';
import api from '../../config/api';

jest.mock('../../config/api', () => ({
    __esModule: true,
    default: { get: jest.fn() },
}));

describe('getCatalogos (caché en memoria)', () => {
    beforeEach(() => {
        clearCatalogosCache();
        api.get.mockReset();
        api.get.mockResolvedValue({ data: { galpones: [1, 2] } });
    });

    it('pide a la API en la primera llamada', async () => {
        const data = await getCatalogos();
        expect(api.get).toHaveBeenCalledTimes(1);
        expect(data).toEqual({ galpones: [1, 2] });
    });

    it('reutiliza la caché en la segunda llamada (no vuelve a pedir)', async () => {
        await getCatalogos();
        await getCatalogos();
        expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('con force=true vuelve a pedir aunque haya caché', async () => {
        await getCatalogos();
        await getCatalogos(true);
        expect(api.get).toHaveBeenCalledTimes(2);
    });

    it('clearCatalogosCache invalida la caché', async () => {
        await getCatalogos();
        clearCatalogosCache();
        await getCatalogos();
        expect(api.get).toHaveBeenCalledTimes(2);
    });
});
