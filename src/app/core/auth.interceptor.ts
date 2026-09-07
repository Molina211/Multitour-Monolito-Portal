import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from './session.service';

// Agrega "Authorization: Bearer <token>" a toda request saliente cuando exista sesion
// real (POST /api/tenants/{tenantId}/login). Sin sesion, la request sale sin ese header
// (varios endpoints del Backend son publicos hoy - ver auditoria seccion 5/22 - asi que no
// bloquear la request aqui, esa decision es del propio Backend).
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService).session();

  if (!session) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${session.accessToken}` },
    }),
  );
};
