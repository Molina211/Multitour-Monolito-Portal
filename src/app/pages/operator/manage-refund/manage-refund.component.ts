import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorReservationService } from '../operator-reservation.service';
import { OperatorRefundService } from '../operator-refund.service';

@Component({
  selector: 'app-operator-manage-refund',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './manage-refund.component.html',
  styleUrl: './manage-refund.component.css',
})
export class ManageRefundComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationService = inject(OperatorReservationService);
  private readonly refundService = inject(OperatorRefundService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  readonly reservation = this.reservationService.getReservation(this.code);
  readonly origin = this.reservation?.refundOrigin;

  private readonly existingRequest = this.origin ? this.refundService.getRequestByReservation(this.code) : undefined;

  disabled = signal(Boolean(this.existingRequest));
  motive = signal(this.origin?.causal || '');
  administrativeNote = signal('');

  feedback = signal(
    !this.reservation || !this.origin
      ? 'Esta reserva no tiene una cancelación o modificación con causal y valor potencial a devolver registrada.'
      : this.existingRequest
        ? 'Ya existe una solicitud de devolución registrada para esta reserva. Consúltala en Solicitudes de devolución.'
        : 'Registra la solicitud de devolución para esta reserva.',
  );
  feedbackIsValid = signal(false);

  register(): void {
    if (this.disabled() || !this.reservation || !this.origin) return;
    const motive = this.motive().trim();
    if (!motive) {
      this.feedback.set('Registra el motivo de la solicitud de devolución.');
      this.feedbackIsValid.set(false);
      return;
    }
    this.refundService.createFromReservation(
      this.code,
      this.reservation.customer,
      motive,
      this.origin.potentialAmount,
      this.origin.pendingCalculation,
      this.administrativeNote().trim(),
    );
    this.feedback.set('Solicitud de devolución registrada correctamente.');
    this.feedbackIsValid.set(true);
    this.disabled.set(true);
  }
}
