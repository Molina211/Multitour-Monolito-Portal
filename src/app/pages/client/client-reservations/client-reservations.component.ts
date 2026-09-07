import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientReservationService, normalizeClientReservationStatus } from '../client-reservation.service';

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
export class ClientReservationsComponent implements OnInit {
  private readonly reservationService = inject(ClientReservationService);

  // BUG corregido: esta pantalla es la PLANTILLA GENERICA multitenant; resolver "el primer
  // tenant Activo" mostraba el nombre de cualquier tenant creado en Plataforma. Sin sesion
  // real de Cliente, se mantiene el placeholder literal (ver client-dashboard.component.ts).
  tenantName = computed(() => '[Tu Marca]');

  loading = this.reservationService.loading;
  error = this.reservationService.error;

  // "Ver mis reservas" (histórico propio del Cliente): SOLO sus propias reservas, nunca
  // reservas de otro cliente ni de otro tenant (GET .../reservations/me, filtrado por JWT).
  reservations = computed(() =>
    this.reservationService.history().map((reservation) => ({
      ...reservation,
      status: normalizeClientReservationStatus(reservation.status),
    })),
  );

  ngOnInit(): void {
    void this.reservationService.refresh();
  }

  statusClass(status: string): string {
    return STATUS_CLASS[status] || '';
  }
}
