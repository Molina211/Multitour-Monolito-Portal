import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientReservationService, normalizeClientReservationStatus } from '../client-reservation.service';
import { PlatformDataService } from '../../platform/platform-data.service';

@Component({
  selector: 'app-client-payments',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-payments.component.html',
  styleUrl: './client-payments.component.css',
})
export class ClientPaymentsComponent {
  private readonly reservationService = inject(ClientReservationService);
  private readonly platformService = inject(PlatformDataService);

  tenantName = computed(() => this.platformService.tenants().find((tenant) => tenant.status === 'Activo')?.name || 'Multitour');

  // "Mis pagos": SOLO informacion economica de las reservas propias del Cliente. No
  // permite validar/rechazar soportes ni autorizar devoluciones (eso es exclusivo de
  // Colaborador/Administrador) ni consultar pagos de otros clientes.
  payments = computed(() =>
    this.reservationService.history().map((reservation) => ({
      ...reservation,
      status: normalizeClientReservationStatus(reservation.status),
    })),
  );
}
