import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type EstablishmentKind = 'HOTEL' | 'RESTAURANT';

// Espejo exacto de EstablishmentResponse.java
// (GET /api/tenants/{tenantId}/establishments). RN-ASO-001: solo entidad comercial
// (nombre/descripcion/imagen), nunca habitaciones, platos, menus, cupos ni tarifas.
export interface EstablishmentResponse {
  establishmentId: string;
  tenantId: string;
  kind: EstablishmentKind;
  name: string;
  description: string | null;
  image: string | null;
  active: boolean;
  createdAt: string;
}

// Espejo exacto de EstablishmentRequest.java (POST). RN-ASO-001: solo entidad comercial,
// nunca habitaciones ni menus/platos.
export interface EstablishmentRequest {
  kind: EstablishmentKind;
  name: string;
  description: string | null;
  image: string | null;
}

@Injectable({ providedIn: 'root' })
export class EstablishmentApiService {
  private readonly http = inject(HttpClient);

  listByTenant(tenantId: string): Observable<EstablishmentResponse[]> {
    return this.http.get<EstablishmentResponse[]>(`${environment.apiBaseUrl}/tenants/${tenantId}/establishments`);
  }

  create(tenantId: string, request: EstablishmentRequest): Observable<EstablishmentResponse> {
    return this.http.post<EstablishmentResponse>(
      `${environment.apiBaseUrl}/tenants/${tenantId}/establishments`,
      request,
    );
  }

  deactivate(tenantId: string, establishmentId: string): Observable<EstablishmentResponse> {
    return this.http.post<EstablishmentResponse>(
      `${environment.apiBaseUrl}/tenants/${tenantId}/establishments/${establishmentId}/deactivate`,
      {},
    );
  }

  reactivate(tenantId: string, establishmentId: string): Observable<EstablishmentResponse> {
    return this.http.post<EstablishmentResponse>(
      `${environment.apiBaseUrl}/tenants/${tenantId}/establishments/${establishmentId}/reactivate`,
      {},
    );
  }
}
