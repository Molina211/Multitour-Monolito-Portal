import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Tipos reales del Backend (CatalogItemType.java): un solo recurso para Tour, Hospedaje,
// Alimentacion y Transporte, discriminado por "type".
export type CatalogItemType = 'TOUR' | 'LODGING' | 'FOOD' | 'TRANSPORT';

// Espejo exacto de CatalogItemResponse.java (GET /api/tenants/{tenantId}/catalog-items).
// Campos ausentes aqui (descuento, riesgo, medios de pago, condiciones, servicios
// relacionados) NO existen todavia en este contrato: no se inventan en el Frontend.
export interface CatalogItemResponse {
  catalogItemId: string;
  tenantId: string;
  type: CatalogItemType;
  name: string;
  price: number;
  capacity: number | null;
  restrictions: string | null;
  validFrom: string | null;
  validTo: string | null;
  policy: string | null;
  image: string | null;
  route: string | null;
  operationalCost: number | null;
  active: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  listByTenant(tenantId: string): Observable<CatalogItemResponse[]> {
    return this.http.get<CatalogItemResponse[]>(`${environment.apiBaseUrl}/tenants/${tenantId}/catalog-items`);
  }

  getById(tenantId: string, catalogItemId: string): Observable<CatalogItemResponse> {
    return this.http.get<CatalogItemResponse>(
      `${environment.apiBaseUrl}/tenants/${tenantId}/catalog-items/${catalogItemId}`,
    );
  }
}
