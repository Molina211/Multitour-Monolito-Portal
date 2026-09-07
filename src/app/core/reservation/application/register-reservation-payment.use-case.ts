import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PaymentApiService, RegisterPaymentRequest } from '../../payment-api.service';
import { ReservationResponse } from '../../reservation-api.service';

// Paso incremental de Arquitectura Hexagonal: agrupa "registrar el pago de una reserva"
// (POST .../reservations/{id}/payments) bajo un caso de uso propio, mismo criterio que
// CreateReservationUseCase. Unico consumidor real hoy: client-tour-booking.component.ts,
// al confirmar el pago inmediatamente despues de crear la reserva (Efectivo/Abono).
@Injectable({ providedIn: 'root' })
export class RegisterReservationPaymentUseCase {
  private readonly paymentApi = inject(PaymentApiService);

  execute(tenantId: string, reservationId: string, request: RegisterPaymentRequest): Observable<ReservationResponse> {
    return this.paymentApi.registerPayment(tenantId, reservationId, request);
  }
}
