import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Espejo exacto de RegisterCustomerRequest.java / CustomerResponse.java
// (POST /api/tenants/{tenantId}/customers).
export interface RegisterCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
}

export interface CustomerResponse {
  membershipId: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  membershipStatus: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerApiService {
  private readonly http = inject(HttpClient);

  register(tenantId: string, request: RegisterCustomerRequest): Observable<CustomerResponse> {
    return this.http.post<CustomerResponse>(`${environment.apiBaseUrl}/tenants/${tenantId}/customers`, request);
  }
}
