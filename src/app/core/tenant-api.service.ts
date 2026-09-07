import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Espejo exacto de TenantResponse.java (GET/POST /api/tenants*). BLOQUEO BACKEND: este
// contrato NO incluye datos del primer Administrador (nombre/correo) - Membership vive en
// otra tabla y este endpoint no la expone. El Frontend no puede mostrar "Primer
// administrador" para un tenant ya existente sin inventar el dato; ver PlatformDataService.
export interface TenantResponse {
  tenantId: string;
  commercialName: string;
  // Valores reales de TenantStatus.java (enum en espanol, sin tilde: ACTIVO/INACTIVO).
  tenantStatus: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
  allowCollaboratorSupportValidation: boolean;
}

// Espejo de CreateTenantRequest.java. BLOQUEO BACKEND: no acepta un "estado inicial"
// (el tenant siempre nace ACTIVE, ver CreateTenantService.createTenant) ni el nombre del
// primer Administrador (solo email/password) - Membership.createAdministrator no recibe
// firstName/lastName.
export interface CreateTenantRequest {
  tenantId: string;
  commercialName: string;
  actorId: string;
  administrator: {
    email: string;
    password: string;
    passwordConfirmation: string;
  };
}

export interface TenantLifecycleRequest {
  reason: string;
  actorId: string;
}

@Injectable({ providedIn: 'root' })
export class TenantApiService {
  private readonly http = inject(HttpClient);

  listAll(): Observable<TenantResponse[]> {
    return this.http.get<TenantResponse[]>(`${environment.apiBaseUrl}/tenants`);
  }

  getById(tenantId: string): Observable<TenantResponse> {
    return this.http.get<TenantResponse>(`${environment.apiBaseUrl}/tenants/${tenantId}`);
  }

  create(request: CreateTenantRequest): Observable<TenantResponse> {
    return this.http.post<TenantResponse>(`${environment.apiBaseUrl}/tenants`, request);
  }

  deactivate(tenantId: string, request: TenantLifecycleRequest): Observable<TenantResponse> {
    return this.http.post<TenantResponse>(`${environment.apiBaseUrl}/tenants/${tenantId}/deactivate`, request);
  }

  reactivate(tenantId: string, request: TenantLifecycleRequest): Observable<TenantResponse> {
    return this.http.post<TenantResponse>(`${environment.apiBaseUrl}/tenants/${tenantId}/reactivate`, request);
  }
}
