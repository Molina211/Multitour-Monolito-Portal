import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorReservation, OperatorReservationService } from '../operator-reservation.service';
import { parseCOPToNumber } from '../../../core/money.util';

const parseAmount = parseCOPToNumber;

// Fuente real: POST /api/tenants/{tenantId}/reservations/{id}/refund (ReservationApiService,
// via OperatorReservationService.requestRefund). A diferencia del mock anterior, el
// contrato real EXIGE el monto y el metodo de salida desde esta misma solicitud (no existe
// un "pendiente de calculo" en el Backend): quien registra la solicitud determina el monto,
// respaldado por la causal de cancelacion/modificacion ya registrada.
@Component({
  selector: 'app-operator-manage-refund',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './manage-refund.component.html',
  styleUrl: './manage-refund.component.css',
})
export class ManageRefundComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationService = inject(OperatorReservationService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  loading = signal(true);
  reservation = signal<OperatorReservation | undefined>(undefined);

  alreadyRequested = signal(false);
  disabled = signal(true);
  motive = signal('');
  amount = signal('');
  method = signal('Transferencia');
  submitting = signal(false);

  feedback = signal('Cargando reserva...');
  feedbackIsValid = signal(false);

  async ngOnInit(): Promise<void> {
    await this.reservationService.refresh();
    const reservation = this.reservationService.getReservation(this.code);
    this.reservation.set(reservation);
    this.loading.set(false);

    if (!reservation) {
      this.feedback.set('No se encontró la reserva seleccionada.');
      return;
    }
    if (reservation.refundOrigin) {
      this.alreadyRequested.set(true);
      this.disabled.set(true);
      this.feedback.set('Ya existe una solicitud de devolución registrada para esta reserva. Consúltala en Solicitudes de devolución.');
      return;
    }
    this.disabled.set(false);
    this.motive.set(reservation.statusClass === 'is-cancelled' ? 'Cancelación de reserva' : 'Modificación de reserva');
    this.feedback.set('Registra la solicitud de devolución para esta reserva.');
  }

  async register(): Promise<void> {
    if (this.disabled() || !this.reservation()) return;
    const motive = this.motive().trim();
    const amount = parseAmount(this.amount());
    if (!motive) {
      this.feedback.set('Registra el motivo de la solicitud de devolución.');
      this.feedbackIsValid.set(false);
      return;
    }
    if (!amount || amount <= 0) {
      this.feedback.set('Registra un monto a devolver mayor a $0.');
      this.feedbackIsValid.set(false);
      return;
    }

    this.submitting.set(true);
    const result = await this.reservationService.requestRefund(this.code, amount, motive, this.method());
    this.submitting.set(false);
    if (!result.ok) {
      this.feedback.set(result.message);
      this.feedbackIsValid.set(false);
      return;
    }
    this.feedback.set('Solicitud de devolución registrada correctamente.');
    this.feedbackIsValid.set(true);
    this.disabled.set(true);
  }
}
