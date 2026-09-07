import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuditApiService, AuditRecordResponse } from '../../core/audit-api.service';
import { CreateTenantRequest, TenantApiService, TenantResponse } from '../../core/tenant-api.service';
import { SessionService } from '../../core/session.service';

export interface PlatformTenant {
  id: string;
  name: string;
  status: 'Activo' | 'Inactivo';
  createdAt: string;
  allowCollaboratorSupportValidation: boolean;
}

// Vista de un AuditRecord real (GET /api/audit). BLOQUEO BACKEND: el contrato no incluye
// nombre/rol de quien ejecuto la accion (solo "actorId", el membershipId), asi que ya no se
// muestra un actor "Fernanda Robayo" inventado - se muestra el actorId real tal cual, o
// "No disponible" si viniera vacio.
export interface PlatformAuditEvent {
  auditRecordId: string;
  date: string;
  action: string;
  tenantName: string;
  tenantId: string | null;
  actorId: string;
  reason: string;
  affectedRecordId: string;
  previousValue: string;
  newValue: string;
  module: string;
  functionalReference: string;
}

function toDisplayStatus(status: TenantResponse['tenantStatus']): 'Activo' | 'Inactivo' {
  return status === 'ACTIVO' ? 'Activo' : 'Inactivo';
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${formatDate(iso)}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function toPlatformTenant(response: TenantResponse): PlatformTenant {
  return {
    id: response.tenantId,
    name: response.commercialName,
    status: toDisplayStatus(response.tenantStatus),
    createdAt: formatDate(response.createdAt),
    allowCollaboratorSupportValidation: response.allowCollaboratorSupportValidation,
  };
}

// Fuente real: TenantController (/api/tenants*) y AuditController (/api/audit). Reemplaza
// la simulacion local que existia antes (localStorage con 3 tenants hardcodeados).
@Injectable({ providedIn: 'root' })
export class PlatformDataService {
  private readonly tenantApi = inject(TenantApiService);
  private readonly auditApi = inject(AuditApiService);
  private readonly sessionService = inject(SessionService);

  private readonly tenantsSignal = signal<PlatformTenant[]>([]);
  private readonly tenantsRawSignal = signal<TenantResponse[]>([]);
  private readonly auditRawSignal = signal<AuditRecordResponse[]>([]);

  readonly tenants = this.tenantsSignal.asReadonly();
  readonly tenantsLoading = signal(false);
  readonly tenantsError = signal('');

  readonly audit = computed<PlatformAuditEvent[]>(() => {
    const tenantNameById = new Map(this.tenantsRawSignal().map((tenant) => [tenant.tenantId, tenant.commercialName]));
    return this.auditRawSignal().map((record) => ({
      auditRecordId: record.auditRecordId,
      date: formatDateTime(record.recordedAt),
      action: record.action,
      tenantId: record.tenantId,
      tenantName: (record.tenantId && tenantNameById.get(record.tenantId)) || record.tenantId || 'Sin tenant',
      actorId: record.actorId,
      reason: record.reason || 'No aplica',
      affectedRecordId: record.affectedRecordId,
      previousValue: record.previousValue || 'No aplica',
      newValue: record.newValue || 'No aplica',
      module: record.channelOrModule || 'No aplica',
      functionalReference: record.functionalProcessReference || 'No aplica',
    }));
  });
  readonly auditLoading = signal(false);
  readonly auditError = signal('');

  async loadTenants(): Promise<void> {
    this.tenantsLoading.set(true);
    this.tenantsError.set('');
    try {
      const tenants = await firstValueFrom(this.tenantApi.listAll());
      this.tenantsRawSignal.set(tenants);
      this.tenantsSignal.set(tenants.map(toPlatformTenant));
    } catch (error) {
      this.tenantsError.set(this.mapError(error));
    } finally {
      this.tenantsLoading.set(false);
    }
  }

  async loadAudit(): Promise<void> {
    this.auditLoading.set(true);
    this.auditError.set('');
    try {
      const records = await firstValueFrom(this.auditApi.listAll());
      this.auditRawSignal.set(records);
    } catch (error) {
      this.auditError.set(this.mapError(error));
    } finally {
      this.auditLoading.set(false);
    }
  }

  findTenant(tenantId: string): PlatformTenant | undefined {
    return this.tenantsSignal().find((tenant) => tenant.id === tenantId);
  }

  async fetchTenant(tenantId: string): Promise<PlatformTenant | null> {
    try {
      const tenant = await firstValueFrom(this.tenantApi.getById(tenantId));
      return toPlatformTenant(tenant);
    } catch {
      return null;
    }
  }

  async createTenant(input: {
    tenantId: string;
    commercialName: string;
    adminEmail: string;
    initialPassword: string;
    confirmPassword: string;
  }): Promise<{ ok: true } | { ok: false; message: string }> {
    const request: CreateTenantRequest = {
      tenantId: input.tenantId,
      commercialName: input.commercialName,
      actorId: this.sessionService.session()?.membershipId ?? '',
      administrator: {
        email: input.adminEmail,
        password: input.initialPassword,
        passwordConfirmation: input.confirmPassword,
      },
    };
    try {
      const tenant = await firstValueFrom(this.tenantApi.create(request));
      this.tenantsRawSignal.set([tenant, ...this.tenantsRawSignal()]);
      this.tenantsSignal.set([toPlatformTenant(tenant), ...this.tenantsSignal()]);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: this.mapError(error) };
    }
  }

  async setTenantStatus(
    tenantId: string,
    action: 'deactivate' | 'reactivate',
    reason: string,
  ): Promise<{ ok: true; tenant: PlatformTenant } | { ok: false; message: string }> {
    const request = { reason, actorId: this.sessionService.session()?.membershipId ?? '' };
    try {
      const tenant =
        action === 'deactivate'
          ? await firstValueFrom(this.tenantApi.deactivate(tenantId, request))
          : await firstValueFrom(this.tenantApi.reactivate(tenantId, request));
      this.tenantsRawSignal.set(this.tenantsRawSignal().map((t) => (t.tenantId === tenantId ? tenant : t)));
      this.tenantsSignal.set(this.tenantsSignal().map((t) => (t.id === tenantId ? toPlatformTenant(tenant) : t)));
      return { ok: true, tenant: toPlatformTenant(tenant) };
    } catch (error) {
      return { ok: false, message: this.mapError(error) };
    }
  }

  private mapError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) return error.error?.message || 'El identificador ya pertenece a otro operador.';
      if (error.status === 400) return error.error?.message || 'Revisa los datos ingresados.';
      if (error.status === 404) return 'El operador no existe.';
      if (error.status === 0) return 'No se pudo conectar con el servidor. Intenta de nuevo.';
    }
    return 'No fue posible completar la operacion. Intenta de nuevo mas tarde.';
  }
}
