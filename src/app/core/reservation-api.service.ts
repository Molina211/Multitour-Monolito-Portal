import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReservedServiceRequest {
  serviceReference: string;
  partySize: number | null;
  scheduledDate: string | null;
  transportItemId: string | null;
}

export interface ReservedServiceResponse {
  serviceReference: string;
  partySize: number | null;
  scheduledDate: string | null;
  transportItemId: string | null;
  transportCost: number | null;
}

export interface CompanionRequest {
  name: string;
  document: string;
  birthDate: string | null;
}

export interface CompanionResponse {
  name: string;
  document: string;
  birthDate: string | null;
}

// Espejo exacto de CreateReservationRequest.java. "customerId" NO va en el body: el
// Backend lo toma del JWT (Authentication -> JwtPrincipal.membershipId()), por eso este
// endpoint exige sesion real y no admite crear una reserva a nombre de otro cliente.
export interface CreateReservationRequest {
  projectedValue: number;
  reservedServices: ReservedServiceRequest[];
  holderDocument: string;
  companions: CompanionRequest[];
}

// Espejo exacto de ReservationResponse.java.
export interface ReservationResponse {
  reservationId: string;
  tenantId: string;
  customerId: string;
  reservedServices: ReservedServiceResponse[];
  projectedValue: number;
  finalValue: number | null;
  pendingBalance: number | null;
  creditBalance: number | null;
  reservationStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  createdAt: string;
  pendingTransferAmount: number | null;
  transferSupportReference: string | null;
  cancellationReason: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  refundDecisionStatus: string | null;
  refundAuthorizedBy: string | null;
  refundAuthorizedAt: string | null;
  refundAuthorizationNote: string | null;
  refundRejectedBy: string | null;
  refundRejectedAt: string | null;
  refundRejectionReason: string | null;
  refundedAmount: number | null;
  refundReason: string | null;
  refundedBy: string | null;
  refundMethod: string | null;
  refundedAt: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
  modificationReason: string | null;
  modifiedBy: string | null;
  modifiedAt: string | null;
  holderDocument: string | null;
  companions: CompanionResponse[];
}

export interface CancelReservationRequest {
  reason: string;
  actorId: string;
}

export interface ModifyReservationRequest {
  reservedServices: ReservedServiceRequest[];
  projectedValue: number | null;
  finalValue: number | null;
  reason: string;
  actorId: string;
}

export interface ApplyDiscountRequest {
  percentage: number;
  reason: string;
  actorId: string;
}

export interface FinalizeReservationRequest {
  actorId: string;
}

// method: mismos 3 medios de pago reales (EFECTIVO/TRANSFERENCIA/ABONO), sin inventar tarjeta.
export interface RefundReservationRequest {
  amount: number;
  reason: string;
  actorId: string;
  method: string;
}

export interface AuthorizeRefundRequest {
  actorId: string;
  note: string | null;
}

export interface RejectRefundRequest {
  actorId: string;
  reason: string;
}

export interface RegisterRefundAsCreditBalanceRequest {
  actorId: string;
}

@Injectable({ providedIn: 'root' })
export class ReservationApiService {
  private readonly http = inject(HttpClient);

  private base(tenantId: string): string {
    return `${environment.apiBaseUrl}/tenants/${tenantId}/reservations`;
  }

  // Requiere sesion END_CUSTOMER real (JWT); el authInterceptor ya adjunta el token.
  create(tenantId: string, request: CreateReservationRequest): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(this.base(tenantId), request);
  }

  listByTenant(tenantId: string): Observable<ReservationResponse[]> {
    return this.http.get<ReservationResponse[]>(this.base(tenantId));
  }

  getById(tenantId: string, reservationId: string): Observable<ReservationResponse> {
    return this.http.get<ReservationResponse>(`${this.base(tenantId)}/${reservationId}`);
  }

  // GET .../me* tambien requiere sesion END_CUSTOMER real.
  listMine(tenantId: string): Observable<ReservationResponse[]> {
    return this.http.get<ReservationResponse[]>(`${this.base(tenantId)}/me`);
  }

  getMineById(tenantId: string, reservationId: string): Observable<ReservationResponse> {
    return this.http.get<ReservationResponse>(`${this.base(tenantId)}/me/${reservationId}`);
  }

  cancel(tenantId: string, reservationId: string, request: CancelReservationRequest): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(`${this.base(tenantId)}/${reservationId}/cancel`, request);
  }

  modify(tenantId: string, reservationId: string, request: ModifyReservationRequest): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(`${this.base(tenantId)}/${reservationId}/modify`, request);
  }

  applyDiscount(
    tenantId: string,
    reservationId: string,
    request: ApplyDiscountRequest,
  ): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(`${this.base(tenantId)}/${reservationId}/apply-discount`, request);
  }

  finalize(tenantId: string, reservationId: string, request: FinalizeReservationRequest): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(`${this.base(tenantId)}/${reservationId}/finalize`, request);
  }

  refund(tenantId: string, reservationId: string, request: RefundReservationRequest): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(`${this.base(tenantId)}/${reservationId}/refund`, request);
  }

  authorizeRefund(
    tenantId: string,
    reservationId: string,
    request: AuthorizeRefundRequest,
  ): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(`${this.base(tenantId)}/${reservationId}/refund/authorize`, request);
  }

  rejectRefund(tenantId: string, reservationId: string, request: RejectRefundRequest): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(`${this.base(tenantId)}/${reservationId}/refund/reject`, request);
  }

  registerRefundAsCreditBalance(
    tenantId: string,
    reservationId: string,
    request: RegisterRefundAsCreditBalanceRequest,
  ): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(
      `${this.base(tenantId)}/${reservationId}/refund/credit-balance`,
      request,
    );
  }
}
