import { Injectable, signal } from '@angular/core';

// Roles base confirmados en el PDR (seccion 14): Administrador y Colaborador operativo.
// No se inventan permisos nuevos: el Colaborador operativo reutiliza las MISMAS pantallas
// del Administrador, solo se ocultan/restringen las acciones que el PDR reserva al
// Administrador (linea 102/112/114/116/566/689).
export type OperatorRole = 'admin' | 'colaborador';

const OPERATOR_ROLE_KEY = 'multitour-operator-role';

// Restriccion base (PDR linea 114/554): el Colaborador operativo solo puede validar o
// rechazar soportes de transferencia cuando el tenant lo habilite expresamente para ese
// rol. Ningun tenant lo ha habilitado en este entorno local (no existe parametrizacion de
// tenant real todavia): por defecto queda deshabilitado, no se inventa una habilitacion.
export const OPERATOR_COLLABORATOR_CAN_VALIDATE_SUPPORT = false;

function readStoredRole(): OperatorRole {
  try {
    const raw = localStorage.getItem(OPERATOR_ROLE_KEY);
    return raw === 'colaborador' ? 'colaborador' : 'admin';
  } catch {
    return 'admin';
  }
}

@Injectable({ providedIn: 'root' })
export class OperatorRoleService {
  private readonly roleSignal = signal<OperatorRole>(readStoredRole());
  readonly role = this.roleSignal.asReadonly();

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
