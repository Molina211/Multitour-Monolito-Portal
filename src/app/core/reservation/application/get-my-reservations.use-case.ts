import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ReservationApiService, ReservationResponse } from '../../reservation-api.service';

// Paso incremental de Arquitectura Hexagonal: agrupa "consultar mis reservas" (GET
// .../reservations/me) bajo un caso de uso propio, mismo criterio que
// CreateReservationUseCase. Usado por ClientReservationService para refrescar el estado de
// reserva del cliente autenticado.
@Injectable({ providedIn: 'root' })
export class GetMyReservationsUseCase {
  private readonly reservationApi = inject(ReservationApiService);

  execute(tenantId: string): Observable<ReservationResponse[]> {
    return this.reservationApi.listMine(tenantId);
  }
}
