import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OperatorReservation, OperatorReservationService } from '../operator-reservation.service';

@Component({
  selector: 'app-operator-apply-discount',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './apply-discount.component.html',
  styleUrl: './apply-discount.component.css',
})
export class ApplyDiscountComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reservationService = inject(OperatorReservationService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  loading = this.reservationService.loading;
  reservation = signal<OperatorReservation | undefined>(undefined);

  notFound = computed(() => !this.loading() && !this.reservation());
  ineligible = computed(() => {
    const r = this.reservation();
    return Boolean(r) && !this.reservationService.isEligibleForAdditionalDiscount(r!.statusClass);
  });

  percentage = signal<number | null>(null);
  reason = signal('');
  applied = signal(false);
  submitting = signal(false);
  feedback = signal('Solo el Administrador puede autorizar descuentos adicionales; el motivo queda asociado a la reserva.');
  feedbackIsValid = signal(false);

  disabledForm = computed(() => this.notFound() || this.ineligible() || this.applied());

  private currentValueNumber = computed(() => {
    const raw = this.reservationService.findRaw(this.code);
    return raw ? (raw.finalValue ?? raw.projectedValue) : 0;
  });
  newValue = computed(() => {
    const percentage = this.percentage() || 0;
    return `$${Math.round(this.currentValueNumber() * (1 - percentage / 100)).toLocaleString('es-CO')}`;
  });

  async ngOnInit(): Promise<void> {
    await this.reservationService.refresh();
    this.reservation.set(this.reservationService.getReservation(this.code));
    if (!this.reservation()) {
      this.feedback.set('No se encontró la reserva seleccionada. Vuelve a Reservas e ingresa nuevamente por Aplicar descuento.');
    } else if (this.ineligible()) {
      this.feedback.set(`Esta reserva está en estado "${this.reservation()!.status}" y ya no admite modificaciones: no se puede aplicar un descuento adicional.`);
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const percentage = this.percentage();
    const reason = this.reason().trim();
    if (!percentage || percentage <= 0 || percentage > 100 || !reason) {
      this.feedback.set('Ingresa un porcentaje entre 1 y 100 y describe el motivo obligatorio del descuento adicional.');
      this.feedbackIsValid.set(false);
      return;
    }
    if (!this.reservation() || this.ineligible()) return;

    this.submitting.set(true);
    this.feedback.set('Aplicando...');
    const result = await this.reservationService.applyAdditionalDiscount(this.code, percentage, reason);
    this.submitting.set(false);

    if (!result.ok) {
      this.feedback.set(result.message);
      this.feedbackIsValid.set(false);
      return;
    }
    this.feedback.set('Descuento adicional aplicado correctamente.');
    this.feedbackIsValid.set(true);
    this.applied.set(true);
    window.setTimeout(() => this.router.navigateByUrl('/operator/reservations'), 1400);
  }
}
