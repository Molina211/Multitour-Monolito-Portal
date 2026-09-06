// BRECHA REPORTADA (integracion Backend, bloque 1): el Portal no tiene hoy ningun
// mecanismo real de resolucion de tenant (sin selector, sin subdominio, sin config por
// build). Se reutiliza el MISMO valor ya asumido implicitamente en el resto del Portal
// (operator-collaborator.service.ts: OPERATOR_CURRENT_TENANT_ID, y el tenant semilla de
// platform-data.service.ts), en vez de inventar un selector nuevo. Cuando exista una
// decision real de como el Portal determina su tenant activo (login con tenant elegido,
// subdominio, config de despliegue, etc.), este valor debe reemplazarse por ese mecanismo.
export const CURRENT_TENANT_ID = 'travesia-natural';
