import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorReservation, OperatorReservationService } from '../operator-reservation.service';
import { PAYMENT_METHOD_FROM_LABEL, PaymentApiService } from '../../../core/payment-api.service';
import { parseCOPToNumber } from '../../../core/money.util';
import { SessionService } from '../../../core/session.service';

const parseCurrency = parseCOPToNumber;

const METHOD_TO_BACKEND = PAYMENT_METHOD_FROM_LABEL;

@Component({
  selector: 'app-operator-payment-management',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './payment-management.component.html',
  styleUrl: './payment-management.component.css',
})
export class PaymentManagementComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationService = inject(OperatorReservationService);
  private readonly paymentApi = inject(PaymentApiService);
  private readonly sessionService = inject(SessionService);

  private readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  loading = signal(true);
  reservation = signal<OperatorReservation | null>(null);
  notFound = computed(() => !this.loading() && !this.reservation());

  amount = signal('');
  supportFileName = signal('');
  submitting = signal(false);
  feedback = signal('Registra el monto para actualizar el estado de pago y el saldo pendiente.');
  feedbackIsValid = signal(false);

  isTransfer = computed(() => this.reservation()?.method === 'Transferencia');
  isInstallment = computed(() => this.reservation()?.method === 'Abono');
  hasSupportedMethod = computed(() => ['Efectivo', 'Transferencia', 'Abono'].includes(this.reservation()?.method || ''));
  isCancelled = computed(() => this.reservation()?.statusClass === 'is-cancelled');
  isSettled = computed(() => this.isCancelled() || this.reservation()?.payment === 'Pagado' || parseCurrency(this.reservation()?.balance) === 0);
  isPendingValidation = computed(() => this.isTransfer() && this.reservation()?.payment === 'En validación');
  showReview = computed(() => !this.isSettled() && this.isPendingValidation());
  submitLabel = computed(() => (this.isTransfer() ? 'Registrar soporte' : this.isInstallment() ? 'Registrar abono' : 'Registrar pago'));
  amountPlaceholder = computed(() => (this.isInstallment() ? 'Monto del abono' : 'Monto recibido'));
  paymentHeading = computed(() => (this.isCancelled() ? 'Reserva cancelada' : this.isSettled() ? 'Pago registrado' : 'Registra el pago de esta reserva'));
  completedNote = computed(() =>
    this.isCancelled()
      ? 'Esta reserva está cancelada: no se pueden registrar nuevos pagos ni soportes. Se conserva la trazabilidad existente.'
      : 'No existen valores pendientes por registrar para esta reserva.',
  );

  async ngOnInit(): Promise<void> {
    await this.reservationService.refresh();
    this.reservation.set(this.code ? this.reservationService.getReservation(this.code) || null : null);
    this.loading.set(false);
  }

  onSupportChange(files: FileList | null): void {
    this.supportFileName.set(files?.[0]?.name || '');
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const reservation = this.reservation();
    if (!reservation || !this.hasSupportedMethod() || this.isCancelled()) return;
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) return;

    const enteredAmount = parseCurrency(this.amount());
    const balance = parseCurrency(reservation.balance);

    if (!enteredAmount || enteredAmount <= 0 || enteredAmount > balance) {
      this.feedback.set('Registra un monto mayor a $0 y que no supere el saldo pendiente.');
      this.feedbackIsValid.set(false);
      return;
    }
    if (this.isTransfer() && !this.supportFileName()) {
      this.feedback.set('Adjunta el soporte de transferencia para enviarlo a validación.');
      this.feedbackIsValid.set(false);
      return;
    }
    if (!this.isTransfer() && !this.isInstallment() && enteredAmount < balance) {
      this.feedback.set('El efectivo debe cubrir el saldo pendiente. Registra un abono si el pago es parcial.');
      this.feedbackIsValid.set(false);
      return;
    }

    const backendMethod = METHOD_TO_BACKEND[reservation.method];
    this.submitting.set(true);
    this.feedback.set('Registrando...');
    this.paymentApi
      .registerPayment(tenantId, reservation.code, {
        method: backendMethod,
        amount: enteredAmount,
        supportReference: this.isTransfer() ? this.supportFileName() : null,
      })
      .subscribe({
        next: async () => {
          await this.reservationService.refresh();
          this.reservation.set(this.reservationService.getReservation(this.code) || null);
          this.submitting.set(false);
          this.feedback.set(
            this.isTransfer()
              ? 'Soporte registrado. El pago queda en validación y la reserva permanece pendiente de pago.'
              : 'Pago registrado.',
          );
          this.feedbackIsValid.set(true);
        },
        error: (err) => {
          this.submitting.set(false);
          this.feedback.set(err?.error?.message || 'No fue posible registrar el pago.');
          this.feedbackIsValid.set(false);
        },
      });
  }

  async onApprove(): Promise<void> {
    const reservation = this.reservation();
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    if (!reservation || !tenantId || !actorId || this.isCancelled()) return;
    this.submitting.set(true);
    this.paymentApi.decideSupport(tenantId, reservation.code, { decision: 'APPROVE', reason: 'Soporte validado', actorId }).subscribe({
      next: async () => {
        await this.reservationService.refresh();
        this.reservation.set(this.reservationService.getReservation(this.code) || null);
        this.submitting.set(false);
        this.feedback.set('Soporte validado.');
        this.feedbackIsValid.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.feedback.set(err?.error?.message || 'No fue posible validar el soporte.');
        this.feedbackIsValid.set(false);
      },
    });
  }

  async onReject(): Promise<void> {
    const reservation = this.reservation();
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    if (!reservation || !tenantId || !actorId || this.isCancelled()) return;
    this.submitting.set(true);
    this.paymentApi.decideSupport(tenantId, reservation.code, { decision: 'REJECT', reason: 'Soporte rechazado', actorId }).subscribe({
      next: async () => {
        await this.reservationService.refresh();
        this.reservation.set(this.reservationService.getReservation(this.code) || null);
        this.submitting.set(false);
        this.amount.set('');
        this.supportFileName.set('');
        this.feedback.set('Soporte rechazado. Se mantiene el saldo pendiente y puedes registrar un nuevo pago dentro del plazo vigente.');
        this.feedbackIsValid.set(false);
      },
      error: (err) => {
        this.submitting.set(false);
        this.feedback.set(err?.error?.message || 'No fue posible rechazar el soporte.');
        this.feedbackIsValid.set(false);
      },
    });
  }
}
