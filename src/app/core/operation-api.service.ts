import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReservationResponse } from './reservation-api.service';

export interface RegisterExecutionRequest {
  served: boolean;
  executed: number | null;
  causal: string | null;
  actorId: string;
}

export interface ExecutionResponse {
  reservationId: string;
  served: boolean;
  executed: number | null;
  causal: string | null;
  actorId: string;
  recordedAt: string;
  finalized: boolean;
  finalizedBy: string | null;
  finalizedAt: string | null;
}

export interface RegisterOperationCostRequest {
  concept: string;
  amount: number;
  actorId: string;
}

export interface OperationCostResponse {
  costId: string;
  reservationId: string;
  concept: string;
  amount: number;
  actorId: string;
  recordedAt: string;
}

// Reserva comercial (ReservationController) != Ejecucion operativa (OperationController):
// dos bounded contexts distintos, aunque comparten la ruta base .../reservations/{id}.
@Injectable({ providedIn: 'root' })
export class OperationApiService {
  private readonly http = inject(HttpClient);

  private base(tenantId: string): string {
    return `${environment.apiBaseUrl}/tenants/${tenantId}/reservations`;
  }

  registerExecution(
    tenantId: string,
    reservationId: string,
    request: RegisterExecutionRequest,
  ): Observable<ExecutionResponse> {
    return this.http.post<ExecutionResponse>(`${this.base(tenantId)}/${reservationId}/execution`, request);
  }

  getExecution(tenantId: string, reservationId: string): Observable<ExecutionResponse> {
    return this.http.get<ExecutionResponse>(`${this.base(tenantId)}/${reservationId}/execution`);
  }

  listPendingExecution(tenantId: string): Observable<ReservationResponse[]> {
    return this.http.get<ReservationResponse[]>(`${this.base(tenantId)}/pending-execution`);
  }

  registerCost(
    tenantId: string,
    reservationId: string,
    request: RegisterOperationCostRequest,
  ): Observable<OperationCostResponse> {
    return this.http.post<OperationCostResponse>(`${this.base(tenantId)}/${reservationId}/costs`, request);
  }

  listCosts(tenantId: string, reservationId: string): Observable<OperationCostResponse[]> {
    return this.http.get<OperationCostResponse[]>(`${this.base(tenantId)}/${reservationId}/costs`);
  }
}
