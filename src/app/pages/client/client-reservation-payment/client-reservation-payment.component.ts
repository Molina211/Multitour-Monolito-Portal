import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ClientReservationService } from '../client-reservation.service';
import { TENANT_BANK_ACCOUNT } from '../client-tour-catalog.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../../core/http-error.util';
import { PaymentApiService } from '../../../core/payment-api.service';
import { SessionService } from '../../../core/session.service';

@Component({
  selector: 'app-client-reservation-payment',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-reservation-payment.component.html',
  styleUrl: './client-reservation-payment.component.css',
})
export class ClientReservationPaymentComponent implements OnInit {
  private readonly reservationService = inject(ClientReservationService);
  private readonly paymentApi = inject(PaymentApiService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  tenantName = computed(() => '[Tu Marca]');
  bankAccount = TENANT_BANK_ACCOUNT;

  loading = this.reservationService.loading;
  reservation = computed(() => this.reservationService.activeReservation());

  supportReference = signal('');
  submitting = signal(false);
  feedback = signal('');
  feedbackIsError = signal(false);

  ngOnInit(): void {
    void this.reservationService.refresh();
  }

  // BUG corregido (pantalla nueva): subir el comprobante NO confirma el pago
  // automaticamente (PDR linea 628: requiere ademas validacion operativa de recepcion). El
  // pago se registra via POST .../payments (method TRANSFERENCIA) y queda "En validación"
  // (RegisterPaymentService.registerTransferPayment) hasta que Colaborador/Administrador lo
  // valide (Fase 13, payments/validate).
  uploadSupport(): void {
    const current = this.reservation();
    const tenantId = this.sessionService.tenantId();
    if (!current || !tenantId) return;
    if (!this.supportReference().trim()) {
      this.setFeedback('Ingresa la referencia del comprobante de transferencia.', true);
      return;
    }
    const raw = this.reservationService.findRaw(current.code);
    const amount = raw?.pendingBalance ?? raw?.projectedValue ?? 0;

    this.submitting.set(true);
    this.setFeedback('Enviando comprobante...', false);
    this.paymentApi
      .registerPayment(tenantId, current.code, {
        method: 'TRANSFERENCIA',
        amount,
        supportReference: this.supportReference().trim(),
      })
      .subscribe({
        next: async () => {
          this.submitting.set(false);
          await this.reservationService.refresh();
          this.router.navigateByUrl('/client/reservations');
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.setFeedback(this.mapError(err), true);
        },
      });
  }

  private mapError(error: HttpErrorResponse): string {
    if (error.status === 409) return error.error?.message || 'Esta reserva ya tiene un pago en proceso o resuelto.';
    if (error.status === 400) return error.error?.message || 'Revisa los datos ingresados.';
    if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
    return 'No fue posible registrar el pago.';
  }

  private setFeedback(message: string, isError: boolean): void {
    this.feedback.set(message);
    this.feedbackIsError.set(isError);
  }
}
