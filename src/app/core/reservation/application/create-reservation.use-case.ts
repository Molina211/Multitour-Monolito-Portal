import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateReservationRequest,
  ReservationApiService,
  ReservationResponse,
} from '../../reservation-api.service';

// Paso incremental de Arquitectura Hexagonal (solo lo seguro de separar, sin tomar
// decisiones funcionales nuevas): agrupa "crear una reserva" bajo un caso de uso propio,
// para que la Presentacion (client-tour-booking.component.ts) no dependa directamente de
// ReservationApiService. No se crean CancelReservationUseCase/ModifyReservationUseCase ni
// RescheduleReservationUseCase: el PDR Fase 1 no habilita autogestion de eso para el
// cliente final.
@Injectable({ providedIn: 'root' })
export class CreateReservationUseCase {
  private readonly reservationApi = inject(ReservationApiService);

  execute(tenantId: string, request: CreateReservationRequest): Observable<ReservationResponse> {
    return this.reservationApi.create(tenantId, request);
  }
}
