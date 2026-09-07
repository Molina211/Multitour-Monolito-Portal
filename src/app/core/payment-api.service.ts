import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReservationResponse } from './reservation-api.service';

// method: valores reales validados en RegisterPaymentService (Backend) - cualquier otro
// valor responde 400 "unknown payment method". Medios de pago Fase 1 del PDR: transferencia,
// efectivo, abono. NO se agrega tarjeta (no existe en el Backend).
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'ABONO';

// Mapeo UI<->Backend centralizado (antes duplicado, de forma identica, en 4 archivos de
// operador y cliente). Mismos 3 valores reales, sin agregar ni quitar metodos de pago.
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  ABONO: 'Abono',
};

export const PAYMENT_METHOD_FROM_LABEL: Record<string, PaymentMethod> = {
  Efectivo: 'EFECTIVO',
  Transferencia: 'TRANSFERENCIA',
  Abono: 'ABONO',
};

export interface RegisterPaymentRequest {
  method: PaymentMethod;
  amount: number;
  supportReference: string | null;
}

// decision: valores reales (DecidePaymentSupportService): "APPROVE" | "REJECT".
export interface DecidePaymentSupportRequest {
  decision: 'APPROVE' | 'REJECT';
  reason: string;
  actorId: string;
}

export interface PaymentFollowupRequest {
  note: string;
  actorId: string;
}

export interface PaymentFollowupResponse {
  note: string;
  actorId: string;
  recordedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private readonly http = inject(HttpClient);

  private base(tenantId: string): string {
    return `${environment.apiBaseUrl}/tenants/${tenantId}/reservations`;
  }

  registerPayment(
    tenantId: string,
    reservationId: string,
    request: RegisterPaymentRequest,
  ): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(`${this.base(tenantId)}/${reservationId}/payments`, request);
  }

  decideSupport(
    tenantId: string,
    reservationId: string,
    request: DecidePaymentSupportRequest,
  ): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(
      `${this.base(tenantId)}/${reservationId}/payments/decide-support`,
      request,
    );
  }

  listPendingSupport(tenantId: string): Observable<ReservationResponse[]> {
    return this.http.get<ReservationResponse[]>(`${this.base(tenantId)}/pending-support`);
  }

  registerFollowup(
    tenantId: string,
    reservationId: string,
    request: PaymentFollowupRequest,
  ): Observable<PaymentFollowupResponse> {
    return this.http.post<PaymentFollowupResponse>(
      `${this.base(tenantId)}/${reservationId}/payments/followups`,
      request,
    );
  }

  listFollowups(tenantId: string, reservationId: string): Observable<PaymentFollowupResponse[]> {
    return this.http.get<PaymentFollowupResponse[]>(`${this.base(tenantId)}/${reservationId}/payments/followups`);
  }
}
