import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorReservationService, PaymentFollowupEntry } from '../operator-reservation.service';

@Component({
  selector: 'app-operator-payment-followup',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './payment-followup.component.html',
  styleUrl: './payment-followup.component.css',
})
export class PaymentFollowupComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationService = inject(OperatorReservationService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  readonly record = this.reservationService.getPendingSupportRecords().find((item) => item.code === this.code) || null;
  readonly reservation = this.record ? this.reservationService.getReservation(this.code) : undefined;
  readonly notFound = !this.record || !this.reservation;
  readonly deadlineNote = this.record ? this.reservationService.getPaymentDeadlineNote(this.code) : '';

  note = signal('');
  history = signal<PaymentFollowupEntry[]>(this.notFound ? [] : this.reservationService.getFollowups(this.code));

  feedback = signal(
    this.notFound
      ? 'No se encontró el pago seleccionado. Vuelve a Pagos e ingresa nuevamente por Registrar seguimiento.'
      : 'Registra la nota de seguimiento para dejar constancia del contacto con el cliente.',
  );
  feedbackIsValid = signal(false);

  hasHistory = computed(() => this.history().length > 0);

  registerFollowup(): void {
    if (this.notFound) return;
    const note = this.note().trim();
    if (!note) {
      this.feedback.set('Registra una nota de seguimiento antes de guardar.');
      this.feedbackIsValid.set(false);
      return;
    }
    this.reservationService.addFollowup(this.code, note, 'Administrador del operador');
    this.history.set(this.reservationService.getFollowups(this.code));
    this.note.set('');
    this.feedback.set('Seguimiento registrado correctamente.');
    this.feedbackIsValid.set(true);
  }
}
