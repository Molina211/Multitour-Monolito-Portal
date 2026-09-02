import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorReservation, OperatorReservationService } from '../operator-reservation.service';

const FALLBACK: OperatorReservation = {
  code: 'RES-1843', customer: 'Cliente registrado', email: '', service: 'Servicio seleccionado', date: 'Por confirmar',
  travelers: 1, companions: '', status: 'Pendiente de pago', statusClass: 'is-pending', projected: '$0', discount: '$0',
  final: '$0', paid: '$0', balance: '$0', payment: 'Sin pago', method: 'Sin modalidad definida', execution: '', action: '', href: '',
};

@Component({
  selector: 'app-operator-reservation-created',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reservation-created.component.html',
  styleUrl: './reservation-created.component.css',
})
export class ReservationCreatedComponent {
  private readonly reservationService = inject(OperatorReservationService);

  reservation = computed<OperatorReservation>(() => this.reservationService.draft() ?? FALLBACK);
}
