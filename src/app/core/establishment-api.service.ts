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

@Injectable({ providedIn: 'root' })
export class EstablishmentApiService {
  private readonly http = inject(HttpClient);

  listByTenant(tenantId: string): Observable<EstablishmentResponse[]> {
    return this.http.get<EstablishmentResponse[]>(`${environment.apiBaseUrl}/tenants/${tenantId}/establishments`);
  }
}
