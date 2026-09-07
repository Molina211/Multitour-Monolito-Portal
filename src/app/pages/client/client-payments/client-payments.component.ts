import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientReservationService, normalizeClientReservationStatus } from '../client-reservation.service';

@Component({
  selector: 'app-client-payments',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-payments.component.html',
  styleUrl: './client-payments.component.css',
})
export class ClientPaymentsComponent implements OnInit {
  private readonly reservationService = inject(ClientReservationService);

  loading = this.reservationService.loading;
  error = this.reservationService.error;

  ngOnInit(): void {
    void this.reservationService.refresh();
  }

  // BUG corregido: esta pantalla es la PLANTILLA GENERICA multitenant; resolver "el primer
  // tenant Activo" mostraba el nombre de cualquier tenant creado en Plataforma. Sin sesion
  // real de Cliente, se mantiene el placeholder literal (ver client-dashboard.component.ts).
  tenantName = computed(() => '[Tu Marca]');

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
