// Configuracion por defecto (build de produccion, `ng build` sin --configuration).
// No existe todavia un despliegue real del Backend: se deja el mismo valor local
// documentado en la auditoria (puerto host Docker 8081) hasta que exista una URL de
// produccion real. NO inventar un dominio de produccion que no existe.
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8081/api',
};
