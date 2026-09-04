import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorReservation, OperatorReservationService } from '../operator-reservation.service';

function parseCurrency(value: string | undefined): number {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

function formatCurrency(value: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(value)}`;
}

@Component({
  selector: 'app-operator-payment-management',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './payment-management.component.html',
  styleUrl: './payment-management.component.css',
})
export class PaymentManagementComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationService = inject(OperatorReservationService);

  // Regla (CORREGIR): "Gestión de pago" siempre debe abrir la reserva realmente
  // seleccionada; nunca cae en una reserva fija/por defecto cuando el codigo esta ausente
  // o no se encuentra.
  private readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  readonly notFound = !this.code || !this.reservationService.getReservation(this.code);

  reservation = signal<OperatorReservation>(this.resolveInitial());

  amount = signal('');
  supportFileName = signal('');
  feedback = signal('Registra el monto para actualizar el estado de pago y el saldo pendiente.');
  feedbackIsValid = signal(false);

  isTransfer = computed(() => this.reservation().method === 'Transferencia');
  isInstallment = computed(() => this.reservation().method === 'Abono');
  hasSupportedMethod = computed(() => ['Efectivo', 'Transferencia', 'Abono'].includes(this.reservation().method));
  // Regla (CORREGIR): una reserva Cancelada nunca admite registrar nuevo pago ni soporte,
  // sin importar su saldo; solo consulta economica y trazabilidad existente.
  isCancelled = computed(() => this.reservation().statusClass === 'is-cancelled');
  isSettled = computed(() => this.isCancelled() || this.reservation().payment === 'Pagado' || parseCurrency(this.reservation().balance) === 0);
  isPendingValidation = computed(() => this.isTransfer() && this.reservation().payment === 'En validación' && !!this.reservation().supportPending);
  showReview = computed(() => !this.isSettled() && this.isPendingValidation());
  submitLabel = computed(() => (this.isTransfer() ? 'Registrar soporte' : this.isInstallment() ? 'Registrar abono' : 'Registrar pago'));
  amountPlaceholder = computed(() => (this.isInstallment() ? 'Monto del abono' : 'Monto recibido'));
  paymentHeading = computed(() => (this.isCancelled() ? 'Reserva cancelada' : this.isSettled() ? 'Pago registrado' : 'Registra el pago de esta reserva'));
  // Trazabilidad de abonos (CORREGIR): el historico completo de movimientos, no solo el
  // ultimo o un unico numero acumulado sin desglose.
  paymentMovements = computed(() => this.reservationService.getPaymentMovements(this.reservation().code));
  hasMultipleMovements = computed(() => this.paymentMovements().length > 1);
  completedNote = computed(() =>
    this.isCancelled()
      ? 'Esta reserva está cancelada: no se pueden registrar nuevos pagos ni soportes. Se conserva la trazabilidad existente.'
      : 'No existen valores pendientes por registrar para esta reserva.',
  );

  private resolveInitial(): OperatorReservation {
    const found = this.code ? this.reservationService.getReservation(this.code) : undefined;
    if (found) return { ...found };
    return {
      code: this.code || '—', customer: '—', email: '', service: '', date: '', travelers: 0, companions: '',
      status: 'No encontrada', statusClass: 'is-pending', projected: '$0', discount: '$0',
      final: '$0', paid: '$0', balance: '$0', payment: 'Sin pago', method: '', execution: '', action: '', href: '',
    };
  }

  onSupportChange(files: FileList | null): void {
    this.supportFileName.set(files?.[0]?.name || '');
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.hasSupportedMethod() || this.isCancelled()) return;
    const reservation = this.reservation();
    const enteredAmount = parseCurrency(this.amount());
    const balance = parseCurrency(reservation.balance);
    const currentPaid = parseCurrency(reservation.paid);

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

    let updated: OperatorReservation;
    if (this.isTransfer()) {
      updated = { ...reservation, payment: 'En validación', status: 'Pendiente de pago', statusClass: 'is-pending', pendingTransferAmount: enteredAmount, supportPending: true };
      this.feedback.set('Soporte registrado. El pago queda en validación y la reserva permanece pendiente de pago.');
    } else {
      const newPaid = currentPaid + enteredAmount;
      const newBalance = Math.max(0, parseCurrency(reservation.final) - newPaid);
      const paidInFull = newBalance === 0;
      updated = {
        ...reservation,
        paid: formatCurrency(newPaid),
        balance: formatCurrency(newBalance),
        payment: paidInFull ? 'Pagado' : 'Parcial',
        status: paidInFull ? 'Confirmada' : 'Pendiente de pago',
        statusClass: paidInFull ? 'is-confirmed' : 'is-pending',
      };
      this.feedback.set(
        paidInFull
          ? 'Pago registrado. Se cumplió la condición parametrizada y la reserva quedó confirmada.'
          : 'Abono registrado. El pago queda parcial y se conserva el saldo pendiente.',
      );
      // Trazabilidad de abonos: cada pago/abono realmente registrado queda como un
      // movimiento propio (append-only), para poder consultar el historico completo.
      this.reservationService.addPaymentMovement(reservation.code, formatCurrency(enteredAmount), reservation.method);
    }
    this.reservation.set(updated);
    this.reservationService.saveDraft(updated);
    this.feedbackIsValid.set(true);
  }

  onApprove(): void {
    if (this.isCancelled()) return;
    const reservation = this.reservation();
    const validatedAmount = Number(reservation.pendingTransferAmount || 0);
    const newPaid = parseCurrency(reservation.paid) + validatedAmount;
    const newBalance = Math.max(0, parseCurrency(reservation.final) - newPaid);
    const updated: OperatorReservation = {
      ...reservation,
      paid: formatCurrency(newPaid),
      balance: formatCurrency(newBalance),
      payment: newBalance === 0 ? 'Pagado' : 'Parcial',
      status: newBalance === 0 ? 'Confirmada' : 'Pendiente de pago',
      statusClass: newBalance === 0 ? 'is-confirmed' : 'is-pending',
    };
    delete updated.pendingTransferAmount;
    delete updated.supportPending;
    this.reservation.set(updated);
    this.reservationService.saveDraft(updated);
    if (validatedAmount > 0) {
      this.reservationService.addPaymentMovement(reservation.code, formatCurrency(validatedAmount), reservation.method);
    }
    this.feedback.set(
      newBalance === 0
        ? 'Soporte validado. Se cumplió la condición parametrizada y la reserva quedó confirmada.'
        : 'Soporte validado. El pago queda parcial y se conserva el saldo pendiente.',
    );
    this.feedbackIsValid.set(true);
  }

  onReject(): void {
    if (this.isCancelled()) return;
    const reservation = this.reservation();
    const updated: OperatorReservation = { ...reservation, payment: 'Rechazado', status: 'Pendiente de pago', statusClass: 'is-pending' };
    delete updated.pendingTransferAmount;
    delete updated.supportPending;
    this.reservation.set(updated);
    this.reservationService.saveDraft(updated);
    this.amount.set('');
    this.supportFileName.set('');
    this.feedback.set('Soporte rechazado. Se mantiene el saldo pendiente y puedes registrar un nuevo pago dentro del plazo vigente.');
    this.feedbackIsValid.set(false);
  }
}
