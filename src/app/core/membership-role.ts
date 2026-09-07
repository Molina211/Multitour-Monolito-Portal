// Nombres REALES del enum Backend (MembershipRole.java). NO inventar roles nuevos: el
// Backend define ademas MANAGER/ACCOUNTANT/ANALYST, pero ninguna HU implementada hoy los
// asigna (sin flujo de registro ni de login que los produzca), asi que el Frontend no
// necesita una ruta propia para ellos todavia.
export const PLATFORM_ADMINISTRATOR_ROLE = 'PLATFORM_ADMINISTRATOR';
export const ADMINISTRATOR_ROLE = 'ADMINISTRATOR';
export const OPERATIONAL_COLLABORATOR_ROLE = 'OPERATIONAL_COLLABORATOR';
export const END_CUSTOMER_ROLE = 'END_CUSTOMER';

// Ruta de destino segun el "role" real devuelto por POST /api/tenants/{tenantId}/login.
export function homeRouteForRole(role: string | null): string {
  switch (role) {
    case PLATFORM_ADMINISTRATOR_ROLE:
      return '/platform';
    case ADMINISTRATOR_ROLE:
    case OPERATIONAL_COLLABORATOR_ROLE:
      return '/operator';
    case END_CUSTOMER_ROLE:
      return '/client';
    default:
      return '/login';
  }
}
