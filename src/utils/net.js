// Detección unificada de "esto fue un fallo de RED" (no una respuesta del
// servidor). Función pura para poder testearla sin dependencias nativas.
export const isNetworkError = (error) => {
    return (
        !error?.response ||
        error?.code === 'ERR_NETWORK' ||
        error?.code === 'ECONNABORTED' || // timeout de axios
        error?.message === 'Network Error'
    );
};
