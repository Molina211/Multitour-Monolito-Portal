import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OperatorRoleService } from './operator-role.service';

// Bloquea rutas reservadas al Administrador del operador (Descuentos y edicion de
// catalogo: crear servicio, modificar tarifa/costos/capacidad, activar/desactivar) cuando
// el rol activo es Colaborador. Redirige a la ruta de reemplazo declarada en la propia
// ruta (route.data['colaboradorFallback']), sin inventar un permiso nuevo: el Colaborador
// simplemente nunca llega a estas pantallas, igual que si el menu no las mostrara.
export const colaboradorRestrictedGuard: CanActivateFn = (route) => {
  const roleService = inject(OperatorRoleService);
  const router = inject(Router);
  if (roleService.isColaborador()) {
    const fallback = (route.data?.['colaboradorFallback'] as string) || '/operator';
    return router.parseUrl(fallback);
  }
  return true;
};
