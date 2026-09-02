import { Injectable, signal } from '@angular/core';

export interface PlatformTenant {
  id: string;
  name: string;
  status: 'Activo' | 'Inactivo';
  adminName: string;
  adminEmail: string;
  createdAt: string;
}

export interface PlatformAuditEvent {
  date: string;
  action: string;
  tenant: string;
  tenantId: string;
  detail: string;
  actorName: string;
  actorRole: string;
  reason: string;
  recordAffected: string;
  previousValue: string;
  newValue: string;
  module: string;
  functionalReference: string;
}

const TENANTS_STORAGE_KEY = 'multitour-platform-tenants';
const AUDIT_STORAGE_KEY = 'multitour-platform-audit';
export const PLATFORM_OPERATORS_MODULE = 'Administración de plataforma / Operadores';

const DEFAULT_TENANTS: PlatformTenant[] = [
  { id: 'travesia-natural', name: 'Travesia Natural', status: 'Activo', adminName: 'Laura Gomez', adminEmail: 'laura@travesianatural.co', createdAt: '29 ago 2026' },
  { id: 'huila-adventure', name: 'Huila Adventure', status: 'Activo', adminName: 'Mateo Rojas', adminEmail: 'mateo@huilaadventure.co', createdAt: '27 ago 2026' },
  { id: 'selva-viva', name: 'Selva Viva', status: 'Inactivo', adminName: 'Diana Torres', adminEmail: 'diana@selvaviva.co', createdAt: '20 ago 2026' },
];

const DEFAULT_AUDIT: PlatformAuditEvent[] = [
  { date: '29 ago 2026, 10:32', action: 'Operador creado', tenant: 'Travesia Natural', tenantId: 'travesia-natural', detail: 'Estado inicial: Activo', actorName: 'Fernanda Robayo', actorRole: 'Administrador de plataforma', reason: 'Alta administrativa inicial', recordAffected: 'Operador: travesia-natural', previousValue: 'No aplica', newValue: 'Estado inicial: Activo', module: PLATFORM_OPERATORS_MODULE, functionalReference: 'Alta administrativa de operador' },
  { date: '27 ago 2026, 15:10', action: 'Operador creado', tenant: 'Huila Adventure', tenantId: 'huila-adventure', detail: 'Estado inicial: Activo', actorName: 'Fernanda Robayo', actorRole: 'Administrador de plataforma', reason: 'Alta administrativa inicial', recordAffected: 'Operador: huila-adventure', previousValue: 'No aplica', newValue: 'Estado inicial: Activo', module: PLATFORM_OPERATORS_MODULE, functionalReference: 'Alta administrativa de operador' },
  { date: '25 ago 2026, 09:48', action: 'Operador inactivado', tenant: 'Selva Viva', tenantId: 'selva-viva', detail: 'Activo -> Inactivo', actorName: 'Fernanda Robayo', actorRole: 'Administrador de plataforma', reason: 'Solicitud administrativa registrada', recordAffected: 'Estado del operador: selva-viva', previousValue: 'Activo', newValue: 'Inactivo', module: PLATFORM_OPERATORS_MODULE, functionalReference: 'Cambio de estado de operador' },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Simulacion local (localStorage) sin backend ni persistencia real, igual que el mockup aprobado.
@Injectable({ providedIn: 'root' })
export class PlatformDataService {
  private readonly tenantsSignal = signal<PlatformTenant[]>(readStorage(TENANTS_STORAGE_KEY, DEFAULT_TENANTS));
  private readonly auditSignal = signal<PlatformAuditEvent[]>(readStorage(AUDIT_STORAGE_KEY, DEFAULT_AUDIT));

  readonly tenants = this.tenantsSignal.asReadonly();
  readonly audit = this.auditSignal.asReadonly();

  createTenant(tenant: PlatformTenant): void {
    const next = [tenant, ...this.tenantsSignal()];
    this.tenantsSignal.set(next);
    localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(next));
  }

  findTenant(tenantId: string): PlatformTenant | undefined {
    return this.tenantsSignal().find((tenant) => tenant.id === tenantId);
  }

  updateTenantStatus(tenantId: string, status: 'Activo' | 'Inactivo'): void {
    const next = this.tenantsSignal().map((tenant) => (tenant.id === tenantId ? { ...tenant, status } : tenant));
    this.tenantsSignal.set(next);
    localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(next));
  }

  addAuditEvent(event: PlatformAuditEvent): void {
    const next = [event, ...this.auditSignal()];
    this.auditSignal.set(next);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(next));
  }
}
