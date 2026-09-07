import { isNetworkError, NETWORK_ERROR_MESSAGE } from './http-error.util';

describe('http-error.util (deteccion de error de red compartida)', () => {
  it('isNetworkError() es true solo cuando status es 0', () => {
    expect(isNetworkError({ status: 0 })).toBeTrue();
    expect(isNetworkError({ status: 401 })).toBeFalse();
    expect(isNetworkError({ status: 404 })).toBeFalse();
  });

  it('isNetworkError() es false para null/undefined (sin lanzar error)', () => {
    expect(isNetworkError(null)).toBeFalse();
    expect(isNetworkError(undefined)).toBeFalse();
  });

  it('NETWORK_ERROR_MESSAGE mantiene el mismo texto ya usado en todas las pantallas', () => {
    expect(NETWORK_ERROR_MESSAGE).toBe('No se pudo conectar con el servidor.');
  });
});
