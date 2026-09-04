import { Injectable, signal } from '@angular/core';

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
  private readonly roleSignal = signal<OperatorRole>(readStoredRole());
  readonly role = this.roleSignal.asReadonly();

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
    return this.roleSignal() === 'admin';
  }

  isColaborador(): boolean {
    return this.roleSignal() === 'colaborador';
  }

  roleLabel(): string {
    return this.isColaborador() ? 'Colaborador del operador' : 'Administrador del operador';
  }

  setRole(role: OperatorRole): void {
    this.roleSignal.set(role);
    try {
      localStorage.setItem(OPERATOR_ROLE_KEY, role);
    } catch {
      /* Entorno sin localStorage disponible: el rol sigue vigente en memoria para esta sesion. */
    }
  }
}
