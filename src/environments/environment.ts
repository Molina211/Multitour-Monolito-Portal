// Configuracion por defecto (build de produccion, `ng build` sin --configuration).
// Ruta relativa: Nginx (nginx.conf, location /api/) hace proxy_pass hacia el Backend
// real (host.docker.internal:8081), igual que proxy.conf.json hace con `ng serve`. Asi
// el navegador solo habla con el mismo origen (localhost:8080), sin exponerse al CORS
// no configurado del Backend (ver SecurityConfig.java: sin @CrossOrigin ni
// CorsConfigurationSource). NO inventar un dominio de produccion que no existe.
export const environment = {
  production: true,
  apiBaseUrl: '/api',
};
