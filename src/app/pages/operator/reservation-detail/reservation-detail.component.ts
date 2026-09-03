import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  OPERATOR_RESERVATIONS,
  OperatorReservation,
  OperatorReservationService,
  ReservationAdjustment,
} from '../operator-reservation.service';

function parseCOP(value: string | undefined): number {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

function formatCOP(value: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(value))}`;
}

@Component({
  selector: 'app-operator-reservation-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './reservation-detail.component.html',
  styleUrl: './reservation-detail.component.css',
})
export class ReservationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationService = inject(OperatorReservationService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || 'RES-1842';
  reservation: OperatorReservation | undefined = this.reservationService.getReservation(this.code);
  adjustment: ReservationAdjustment | null = this.reservationService.getAdjustment(this.code);

  readonly canCancelOrModify = this.reservation
    ? this.reservationService.isEligibleForCancelOrModify(this.reservation.statusClass)
    : false;

  // RF-015B (regla 1): cancelar NUNCA borra la reserva, solo cambia su estado; la causal
  // debe quedar visible como historial incluso cuando no exista devolucion que gestionar
  // (esta se muestra en el panel de devolucion cuando si existe, para no duplicarla).
  readonly cancellation = this.reservationService.getReservationCancellation(this.code);
  readonly showCancellationHistory = Boolean(this.cancellation) && !this.reservation?.refundOrigin;

  private readonly originalFinal = OPERATOR_RESERVATIONS[this.code]?.final;

  previousValue = computed(() => (this.adjustment ? this.originalFinal || '$0' : '$0'));

  discountedAmount = computed(() => {
    if (!this.adjustment || !this.reservation) return '$0';
    const previous = parseCOP(this.originalFinal);
    const discounted = Math.max(previous - parseCOP(this.reservation.final), 0);
    return formatCOP(discounted);
  });
}
