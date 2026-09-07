import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Espejo exacto de CollaboratorResponse.java (GET /api/tenants/{tenantId}/collaborators).
export interface CollaboratorResponse {
  membershipId: string;
  tenantId: string;
  name: string;
  email: string;
  // Valor real hoy: siempre "OPERATIONAL_COLLABORATOR" (unico rol que crea este endpoint).
  role: string;
  membershipStatus: string;
  createdAt: string;
}

// Espejo exacto de RegisterCollaboratorRequest.java (POST).
export interface RegisterCollaboratorRequest {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  actorId: string;
}

@Injectable({ providedIn: 'root' })
export class CollaboratorApiService {
  private readonly http = inject(HttpClient);

  listByTenant(tenantId: string): Observable<CollaboratorResponse[]> {
    return this.http.get<CollaboratorResponse[]>(`${environment.apiBaseUrl}/tenants/${tenantId}/collaborators`);
  }

  getById(tenantId: string, membershipId: string): Observable<CollaboratorResponse> {
    return this.http.get<CollaboratorResponse>(
      `${environment.apiBaseUrl}/tenants/${tenantId}/collaborators/${membershipId}`,
    );
  }

  register(tenantId: string, request: RegisterCollaboratorRequest): Observable<CollaboratorResponse> {
    return this.http.post<CollaboratorResponse>(
      `${environment.apiBaseUrl}/tenants/${tenantId}/collaborators`,
      request,
    );
  }
}
