// Modelo de dominio de una sesion autenticada. Misma forma que LoginApiResponse (el DTO
// real de POST /api/tenants/{tenantId}/login) porque hoy no hay divergencia entre "lo que
// el Backend devuelve" y "lo que el dominio de Auth necesita" - no se inventan campos
// nuevos solo para que el dominio "se vea distinto" del DTO de transporte.
export interface AuthSession {
  accessToken: string;
  membershipId: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}
