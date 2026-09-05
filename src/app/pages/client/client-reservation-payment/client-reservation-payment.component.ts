import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ClientReservationService } from '../client-reservation.service';
import { TENANT_BANK_ACCOUNT } from '../client-tour-catalog.service';

@Component({
  selector: 'app-client-reservation-payment',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-reservation-payment.component.html',
  styleUrl: './client-reservation-payment.component.css',
})
export class ClientReservationPaymentComponent {
  private readonly reservationService = inject(ClientReservationService);
  private readonly router = inject(Router);

  tenantName = computed(() => '[Tu Marca]');
  bankAccount = TENANT_BANK_ACCOUNT;

  reservation = computed(() => this.reservationService.activeReservation());

  // BUG corregido (pantalla nueva): subir el comprobante NO confirma el pago
  // automaticamente (PDR linea 628: requiere ademas validacion operativa de recepcion). La
  // reserva queda con estado economico "En validación" hasta esa validacion.
  uploadSupport(): void {
    const current = this.reservation();
    if (!current) return;
    this.reservationService.recordReservation({ ...current, status: 'Pendiente de pago', paymentStatus: 'En validación' });
    this.router.navigateByUrl('/client/reservations');
  }
}
