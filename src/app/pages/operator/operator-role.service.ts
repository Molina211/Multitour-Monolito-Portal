import { Injectable, computed, inject, signal } from '@angular/core';
import { ADMINISTRATOR_ROLE, OPERATIONAL_COLLABORATOR_ROLE } from '../../core/membership-role';
import { SessionService } from '../../core/session.service';

// Roles base confirmados en el PDR (seccion 14): Administrador y Colaborador operativo.
// No se inventan permisos nuevos: el Colaborador operativo reutiliza las MISMAS pantallas
// del Administrador, solo se ocultan/restringen las acciones que el PDR reserva al
// Administrador (linea 102/112/114/116/566/689).
export type OperatorRole = 'admin' | 'colaborador';

const OPERATOR_ROLE_KEY = 'multitour-operator-role';
// BUG corregido: antes era una constante fija (siempre false), sin ninguna forma de que el
// Administrador la habilitara. Restriccion base (PDR linea 114/554): el Colaborador
// operativo solo puede validar o rechazar soportes de transferencia cuando el tenant lo
// habilite expresamente para ese rol; por defecto sigue deshabilitado, pero ahora es un
// parametro real que el Administrador puede activar (Colaboradores).
const COLLABORATOR_CAN_VALIDATE_SUPPORT_KEY = 'multitour-collaborator-can-validate-support';

function readStoredRole(): OperatorRole {
  try {
    const raw = localStorage.getItem(OPERATOR_ROLE_KEY);
    return raw === 'colaborador' ? 'colaborador' : 'admin';
  } catch {
    return 'admin';
  }
}

function readCollaboratorCanValidateSupport(): boolean {
  try {
    return localStorage.getItem(COLLABORATOR_CAN_VALIDATE_SUPPORT_KEY) === 'true';
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class OperatorRoleService {
  private readonly sessionService = inject(SessionService);

  // Fuente heredada (localStorage), usada SOLO cuando todavia no hay sesion real (por
  // ejemplo, navegacion directa en desarrollo sin pasar por /login). En cuanto existe una
  // sesion real (SessionService, poblada por POST /api/tenants/{tenantId}/login), el rol
  // real del JWT manda siempre sobre este valor manual - ya no se puede "elegir" ser
  // Administrador o Colaborador si el Backend dice otra cosa.
  private readonly manualRoleSignal = signal<OperatorRole>(readStoredRole());

  readonly role = computed<OperatorRole>(() => {
    const sessionRole = this.sessionService.role();
    if (sessionRole === ADMINISTRATOR_ROLE) return 'admin';
    if (sessionRole === OPERATIONAL_COLLABORATOR_ROLE) return 'colaborador';
    return this.manualRoleSignal();
  });

  private readonly collaboratorCanValidateSupportSignal = signal<boolean>(readCollaboratorCanValidateSupport());
  readonly collaboratorCanValidateSupport = this.collaboratorCanValidateSupportSignal.asReadonly();

  setCollaboratorCanValidateSupport(value: boolean): void {
    this.collaboratorCanValidateSupportSignal.set(value);
    try {
      localStorage.setItem(COLLABORATOR_CAN_VALIDATE_SUPPORT_KEY, String(value));
    } catch {
      /* Entorno sin localStorage disponible: el valor sigue vigente en memoria para esta sesion. */
    }
  }

  isAdmin(): boolean {
    return this.role() === 'admin';
  }

  isColaborador(): boolean {
    return this.role() === 'colaborador';
  }

  roleLabel(): string {
    return this.isColaborador() ? 'Colaborador del operador' : 'Administrador del operador';
  }

  // Solo tiene efecto visible mientras no exista sesion real (ver comentario de
  // manualRoleSignal). Con sesion real, el signal computado `role` la ignora.
  setRole(role: OperatorRole): void {
    this.manualRoleSignal.set(role);
    try {
      localStorage.setItem(OPERATOR_ROLE_KEY, role);
    } catch {
      /* Entorno sin localStorage disponible: el rol sigue vigente en memoria para esta sesion. */
    }
  }
}
