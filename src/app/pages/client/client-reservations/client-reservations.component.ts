import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientReservationService, normalizeClientReservationStatus } from '../client-reservation.service';
import { PlatformDataService } from '../../platform/platform-data.service';

const STATUS_CLASS: Record<string, string> = {
  'Pendiente de pago': 'is-pending',
  Confirmada: 'is-confirmed',
  'En ejecución': 'is-execution',
  Finalizada: 'is-finalized',
  Cancelada: 'is-cancelled',
};

@Component({
  selector: 'app-client-reservations',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-reservations.component.html',
  styleUrl: './client-reservations.component.css',
})
export class ClientReservationsComponent {
  private readonly reservationService = inject(ClientReservationService);
  private readonly platformService = inject(PlatformDataService);

  tenantName = computed(() => this.platformService.tenants().find((tenant) => tenant.status === 'Activo')?.name || 'Multitour');

  // "Ver mis reservas" (histórico propio del Cliente): SOLO sus propias reservas, nunca
  // reservas de otro cliente ni de otro tenant.
  reservations = computed(() =>
    this.reservationService.history().map((reservation) => ({
      ...reservation,
      status: normalizeClientReservationStatus(reservation.status),
    })),
  );

  statusClass(status: string): string {
    return STATUS_CLASS[status] || '';
  }
}
