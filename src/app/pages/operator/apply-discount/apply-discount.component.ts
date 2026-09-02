import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OPERATOR_RESERVATIONS, OperatorReservationService } from '../operator-reservation.service';

function parseCOP(value: string | undefined): number {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

function formatCOP(value: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(value))}`;
}

@Component({
  selector: 'app-operator-apply-discount',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './apply-discount.component.html',
  styleUrl: './apply-discount.component.css',
})
export class ApplyDiscountComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reservationService = inject(OperatorReservationService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  private readonly base = OPERATOR_RESERVATIONS[this.code];

  notFound = !this.base;
  ineligible = Boolean(this.base) && !this.reservationService.isEligibleForAdditionalDiscount(this.base.statusClass);
  reservation = this.base ? this.reservationService.getReservation(this.code) ?? this.base : null;

  percentage = signal<number | null>(null);
  reason = signal('');
  applied = signal(false);
  feedback = signal(
    this.notFound
      ? 'No se encontró la reserva seleccionada. Vuelve a Reservas e ingresa nuevamente por Aplicar descuento.'
      : this.ineligible
        ? this.ineligibleMessage()
        : 'Solo el Administrador puede autorizar descuentos adicionales; el motivo queda asociado a la reserva.',
  );
  feedbackIsValid = signal(false);

  currentValue = computed(() => parseCOP(this.reservation?.final));
  newValue = computed(() => {
    const percentage = this.percentage() || 0;
    return formatCOP(this.currentValue() * (1 - percentage / 100));
  });

  disabledForm = computed(() => this.notFound || this.ineligible || this.applied());

  ineligibleMessage(): string {
    return `Esta reserva está en estado "${this.base?.status}" y ya no admite modificaciones: no se puede aplicar un descuento adicional.`;
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const percentage = this.percentage();
    const reason = this.reason().trim();
    if (!percentage || percentage <= 0 || percentage > 100 || !reason) {
      this.feedback.set('Ingresa un porcentaje entre 1 y 100 y describe el motivo obligatorio del descuento adicional.');
      this.feedbackIsValid.set(false);
      return;
    }
    if (!this.base || this.ineligible) {
      this.feedback.set(this.ineligibleMessage());
      this.feedbackIsValid.set(false);
      return;
    }

    this.reservationService.applyAdditionalDiscount(this.code, percentage, reason);
    this.feedback.set('Descuento adicional aplicado correctamente.');
    this.feedbackIsValid.set(true);
    this.applied.set(true);
    window.setTimeout(() => {
      this.router.navigateByUrl('/operator/reservations');
    }, 1400);
  }
}
