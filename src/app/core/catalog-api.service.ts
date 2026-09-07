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

// Espejo exacto de CatalogItemRequest.java (POST). "type" no se puede editar despues via
// PATCH (ver CatalogItemPatchRequest.java: "deliberately not editable"), por eso no aparece
// en CatalogItemPatchRequest de abajo.
export interface CatalogItemRequest {
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
}

// Espejo exacto de CatalogItemPatchRequest.java. Semantica PATCH real confirmada en
// CatalogItem.update() (Backend): un campo omitido/null conserva el valor actual, no lo
// borra - por eso todos son opcionales aqui, no hace falta reenviar el objeto completo.
export interface CatalogItemPatchRequest {
  name?: string;
  price?: number;
  capacity?: number | null;
  restrictions?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  policy?: string | null;
  image?: string | null;
  route?: string | null;
  operationalCost?: number | null;
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

  create(tenantId: string, request: CatalogItemRequest): Observable<CatalogItemResponse> {
    return this.http.post<CatalogItemResponse>(`${environment.apiBaseUrl}/tenants/${tenantId}/catalog-items`, request);
  }

  update(tenantId: string, catalogItemId: string, request: CatalogItemPatchRequest): Observable<CatalogItemResponse> {
    return this.http.patch<CatalogItemResponse>(
      `${environment.apiBaseUrl}/tenants/${tenantId}/catalog-items/${catalogItemId}`,
      request,
    );
  }

  deactivate(tenantId: string, catalogItemId: string): Observable<CatalogItemResponse> {
    return this.http.post<CatalogItemResponse>(
      `${environment.apiBaseUrl}/tenants/${tenantId}/catalog-items/${catalogItemId}/deactivate`,
      {},
    );
  }

  reactivate(tenantId: string, catalogItemId: string): Observable<CatalogItemResponse> {
    return this.http.post<CatalogItemResponse>(
      `${environment.apiBaseUrl}/tenants/${tenantId}/catalog-items/${catalogItemId}/reactivate`,
      {},
    );
  }
}
