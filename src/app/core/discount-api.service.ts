import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type DiscountBase = 'original' | 'subtotal';

// Espejo exacto de DiscountResponse.java (GET /api/tenants/{tenantId}/discounts).
export interface DiscountResponse {
  discountId: string;
  tenantId: string;
  catalogItemId: string;
  percentage: number;
  validFrom: string;
  validTo: string;
  priority: number;
  stackable: boolean;
  cap: number | null;
  base: DiscountBase;
  active: boolean;
  createdAt: string;
}

// Espejo exacto de DiscountRequest.java (POST). "base" solo acepta "original"/"subtotal"
// (DiscountRequest.toDiscountBase lanza IllegalArgumentException con cualquier otro valor).
export interface DiscountRequest {
  catalogItemId: string;
  percentage: number;
  validFrom: string;
  validTo: string;
  priority?: number;
  stackable?: boolean;
  cap?: number | null;
  base: DiscountBase;
}

// Espejo exacto de DiscountPatchRequest.java. "catalogItemId" NO es editable via PATCH
// (no existe ese campo en el contrato Backend, igual que "type" en CatalogItemPatchRequest).
export interface DiscountPatchRequest {
  percentage?: number;
  validFrom?: string;
  validTo?: string;
  priority?: number;
  stackable?: boolean;
  cap?: number | null;
  base?: DiscountBase;
}

@Injectable({ providedIn: 'root' })
export class DiscountApiService {
  private readonly http = inject(HttpClient);

  listByTenant(tenantId: string): Observable<DiscountResponse[]> {
    return this.http.get<DiscountResponse[]>(`${environment.apiBaseUrl}/tenants/${tenantId}/discounts`);
  }

  getById(tenantId: string, discountId: string): Observable<DiscountResponse> {
    return this.http.get<DiscountResponse>(`${environment.apiBaseUrl}/tenants/${tenantId}/discounts/${discountId}`);
  }

  create(tenantId: string, request: DiscountRequest): Observable<DiscountResponse> {
    return this.http.post<DiscountResponse>(`${environment.apiBaseUrl}/tenants/${tenantId}/discounts`, request);
  }

  update(tenantId: string, discountId: string, request: DiscountPatchRequest): Observable<DiscountResponse> {
    return this.http.patch<DiscountResponse>(
      `${environment.apiBaseUrl}/tenants/${tenantId}/discounts/${discountId}`,
      request,
    );
  }

  deactivate(tenantId: string, discountId: string): Observable<DiscountResponse> {
    return this.http.post<DiscountResponse>(
      `${environment.apiBaseUrl}/tenants/${tenantId}/discounts/${discountId}/deactivate`,
      {},
    );
  }

  reactivate(tenantId: string, discountId: string): Observable<DiscountResponse> {
    return this.http.post<DiscountResponse>(
      `${environment.apiBaseUrl}/tenants/${tenantId}/discounts/${discountId}/reactivate`,
      {},
    );
  }
}
