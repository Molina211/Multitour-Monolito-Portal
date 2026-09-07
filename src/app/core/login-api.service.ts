import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Espejo exacto de LoginResponse.java (POST /api/tenants/{tenantId}/login). El mismo
// endpoint sirve a los 4 roles de MembershipRole.java (AuthController no filtra por rol);
// quien llama decide que hacer con el "role" que vuelve en la respuesta.
export interface LoginApiResponse {
  accessToken: string;
  membershipId: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class LoginApiService {
  private readonly http = inject(HttpClient);

  login(tenantId: string, email: string, password: string): Observable<LoginApiResponse> {
    return this.http.post<LoginApiResponse>(`${environment.apiBaseUrl}/tenants/${tenantId}/login`, {
      email,
      password,
    });
  }
}
