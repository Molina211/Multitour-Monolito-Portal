import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';
import {
  ADMINISTRATOR_ROLE,
  END_CUSTOMER_ROLE,
  OPERATIONAL_COLLABORATOR_ROLE,
  PLATFORM_ADMINISTRATOR_ROLE,
} from './membership-role';

// Guards de sesion real (Fase 3 de la integracion). Verifican que exista una sesion
// (SessionService, poblada por POST /api/tenants/{tenantId}/login) con uno de los roles
// permitidos para esa zona. IMPORTANTE (ver auditoria, seccion 8): esto es una mejora de
// UX/navegacion en el Frontend, NO sustituye autorizacion real - hoy el Backend
// (SecurityConfig.java) deja permitAll() casi todos los endpoints, asi que alguien podria
// seguir invocando la API directamente sin pasar por aqui. Esa es deuda de Backend, ajena
// a este guard.
export const platformSessionGuard: CanActivateFn = () => {
  const session = inject(SessionService).session();
  if (session?.role === PLATFORM_ADMINISTRATOR_ROLE) {
    return true;
  }
  return inject(Router).parseUrl('/admin-login');
};

export const operatorSessionGuard: CanActivateFn = () => {
  const session = inject(SessionService).session();
  if (session?.role === ADMINISTRATOR_ROLE || session?.role === OPERATIONAL_COLLABORATOR_ROLE) {
    return true;
  }
  return inject(Router).parseUrl('/login');
};

export const clientSessionGuard: CanActivateFn = () => {
  const session = inject(SessionService).session();
  if (session?.role === END_CUSTOMER_ROLE) {
    return true;
  }
  return inject(Router).parseUrl('/login');
};
