import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorReservationService } from '../operator-reservation.service';
import { PaymentApiService, PaymentFollowupResponse } from '../../../core/payment-api.service';
import { SessionService } from '../../../core/session.service';

@Component({
  selector: 'app-operator-payment-followup',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './payment-followup.component.html',
  styleUrl: './payment-followup.component.css',
})
export class PaymentFollowupComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationService = inject(OperatorReservationService);
  private readonly paymentApi = inject(PaymentApiService);
  private readonly sessionService = inject(SessionService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  loading = signal(true);
  notFound = signal(false);
  isSettled = signal(false);

  note = signal('');
  submitting = signal(false);
  history = signal<PaymentFollowupResponse[]>([]);

  feedback = signal('Registra la nota de seguimiento para dejar constancia del contacto con el cliente.');
  feedbackIsValid = signal(false);

  hasHistory = computed(() => this.history().length > 0);

  async ngOnInit(): Promise<void> {
    await this.reservationService.refresh();
    const reservation = this.reservationService.getReservation(this.code);
    const tenantId = this.sessionService.tenantId();
    if (!reservation || !tenantId) {
      this.notFound.set(true);
      this.loading.set(false);
      this.feedback.set('No se encontró el pago seleccionado. Vuelve a Pagos e ingresa nuevamente por Registrar seguimiento.');
      return;
    }
    this.isSettled.set(reservation.payment === 'Pagado' && reservation.balance === '$0');
    if (this.isSettled()) {
      this.feedback.set('Esta reserva ya está pagada: solo puedes consultar el historial de seguimientos existente.');
    }
    this.paymentApi.listFollowups(tenantId, this.code).subscribe({
      next: (items) => {
        this.history.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  registerFollowup(): void {
    if (this.notFound() || this.isSettled()) return;
    const note = this.note().trim();
    if (!note) {
      this.feedback.set('Registra una nota de seguimiento antes de guardar.');
      this.feedbackIsValid.set(false);
      return;
    }
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    if (!tenantId || !actorId) return;

    this.submitting.set(true);
    this.paymentApi.registerFollowup(tenantId, this.code, { note, actorId }).subscribe({
      next: (entry) => {
        this.submitting.set(false);
        this.history.set([entry, ...this.history()]);
        this.note.set('');
        this.feedback.set('Seguimiento registrado correctamente.');
        this.feedbackIsValid.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.feedback.set(err?.error?.message || 'No fue posible registrar el seguimiento.');
        this.feedbackIsValid.set(false);
      },
    });
  }
}
