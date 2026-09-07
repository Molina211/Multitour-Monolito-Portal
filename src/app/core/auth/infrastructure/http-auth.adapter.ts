import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthPort } from '../domain/ports/auth.port';
import { AuthSession } from '../domain/models/auth-session.model';
import { LoginApiService } from '../../login-api.service';

// Unico adaptador que conoce el detalle de transporte real: delega en LoginApiService
// (que a su vez es el unico que conoce HttpClient) hacia POST
// /api/tenants/{tenantId}/login. Implementa AuthPort para que LoginUseCase pueda depender
// solo de la abstraccion, nunca de esta clase ni de HttpClient directamente.
@Injectable({ providedIn: 'root' })
export class HttpAuthAdapter extends AuthPort {
  private readonly loginApi = inject(LoginApiService);

  login(tenantId: string, email: string, password: string): Observable<AuthSession> {
    return this.loginApi.login(tenantId, email, password);
  }
}
