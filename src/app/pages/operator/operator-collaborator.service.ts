import { Injectable, signal } from '@angular/core';

// Rol base confirmado en el PDR (seccion 14, linea 102/112/947): Colaborador operativo.
// No se crean roles personalizados ni matrices de permisos individuales.
export const COLLABORATOR_ROLE = 'Colaborador operativo' as const;

// Tenant principal de validacion y demostracion ya usado en toda la plataforma (PDR linea
// 65: "usando Travesia Natural como tenant principal de validacion y demostracion"; mismo
// id ya usado en PlatformDataService.DEFAULT_TENANTS). No se inventa un tenant nuevo: el
// portal del operador opera siempre dentro de este contexto.
export const OPERATOR_CURRENT_TENANT_ID = 'travesia-natural';
export const OPERATOR_CURRENT_TENANT_NAME = 'Travesia Natural';

export interface OperatorCollaborator {
  id: string;
  name: string;
  email: string;
  role: typeof COLLABORATOR_ROLE;
  tenantId: string;
  createdAt: string;
}

const COLLABORATORS_KEY = 'multitour-operator-collaborators';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// PDR linea 129: al registrar un usuario se exige nombre completo, correo electronico,
// contrasena inicial y confirmacion (mismo mecanismo ya usado para el primer Administrador
// de un tenant en Crear operador). No se inventa un mecanismo nuevo de entrega de
// credenciales; la contrasena se valida pero no se persiste (mismo comportamiento ya
// implementado en CreateOperatorComponent).
export function getPasswordPolicyError(password: string): string {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialCharacter = /[^A-Za-z0-9\s]/.test(password);

  if (hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialCharacter) return '';
  return 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.';
}

// Sin datos de demostracion quemados (RF-015B/Ejecuciones registradas siguen el mismo
// criterio): el listado empieza vacio hasta que el Administrador registre un colaborador
// real. Simulacion local (localStorage) hasta que exista backend.
@Injectable({ providedIn: 'root' })
export class OperatorCollaboratorService {
  private readonly collaboratorsSignal = signal<OperatorCollaborator[]>(readStorage(COLLABORATORS_KEY, []));

  // PDR linea 95/1040: aislamiento estricto por tenant. Se filtra explicitamente por el
  // tenant activo aunque hoy solo exista uno, para no cruzar informacion entre operadores.
  getAll(): OperatorCollaborator[] {
    return this.collaboratorsSignal().filter((c) => c.tenantId === OPERATOR_CURRENT_TENANT_ID);
  }

  getById(id: string): OperatorCollaborator | undefined {
    return this.getAll().find((c) => c.id === id);
  }

  register(name: string, email: string): OperatorCollaborator {
    const collaborator: OperatorCollaborator = {
      id: `colaborador-${Date.now()}`,
      name,
      email,
      role: COLLABORATOR_ROLE,
      tenantId: OPERATOR_CURRENT_TENANT_ID,
      createdAt: new Date().toISOString(),
    };
    const next = [...this.collaboratorsSignal(), collaborator];
    this.collaboratorsSignal.set(next);
    localStorage.setItem(COLLABORATORS_KEY, JSON.stringify(next));
    return collaborator;
  }
}
