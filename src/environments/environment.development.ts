// Usado por `ng serve` (configuracion "development" por defecto) via fileReplacements
// en angular.json. Ruta relativa: el dev-server de Angular reenvia /api al Backend real
// segun proxy.conf.json (ver angular.json > serve > options.proxyConfig), asi el
// Backend nunca necesita configurar CORS para el Frontend de desarrollo.
export const environment = {
  production: false,
  apiBaseUrl: '/api',
};
