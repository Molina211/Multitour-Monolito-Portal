// Antes duplicado, de forma identica, en ~17 archivos (`if (error.status === 0) return
// '...'`): unifica SOLO el caso de error de red (sin conexion al servidor), que siempre
// tuvo el mismo mensaje. Los mensajes especificos por pantalla para 400/401/403/404/409
// NO se tocan aqui - cada pantalla sigue decidiendo los suyos.
export const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor.';

export function isNetworkError(error: { status?: number } | null | undefined): boolean {
  return error?.status === 0;
}
