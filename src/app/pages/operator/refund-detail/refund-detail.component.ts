import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorReservation, OperatorReservationService } from '../operator-reservation.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-refund-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './refund-detail.component.html',
  styleUrl: './refund-detail.component.css',
})
export class RefundDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationService = inject(OperatorReservationService);
  private readonly roleService = inject(OperatorRoleService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  loading = signal(true);
  request = signal<OperatorReservation | undefined>(undefined);

  isPendingAuthorization = computed(() => this.request()?.refundOrigin?.status === 'Pendiente de autorizacion');
  showDecisionPanel = computed(() => this.roleService.isAdmin() && this.isPendingAuthorization());
  showExecute = computed(() => this.request()?.refundOrigin?.status === 'Autorizada');

  decisionNote = signal('');
  decisionFeedback = signal('Registra el motivo y decide si autorizas o rechazas la devolución.');
  decisionFeedbackIsValid = signal(false);
  decisionDone = signal(false);
  decisionSubmitting = signal(false);

  outflow = signal<'' | 'si' | 'no'>('');
  executeFeedback = signal('Registra la ejecución de la devolución autorizada.');
  executeFeedbackIsValid = signal(false);
  executeDone = signal(false);
  executeSubmitting = signal(false);

  async ngOnInit(): Promise<void> {
    await this.reservationService.refresh();
    this.request.set(this.reservationService.getReservation(this.code));
    this.loading.set(false);
  }

  async authorize(): Promise<void> {
    if (this.decisionDone() || !this.isPendingAuthorization()) return;
    const note = this.decisionNote().trim();
    if (!note) {
      this.decisionFeedback.set('Registra el motivo para autorizar la devolución.');
      this.decisionFeedbackIsValid.set(false);
      return;
    }
    this.decisionSubmitting.set(true);
    const result = await this.reservationService.authorizeRefund(this.code, note);
    this.decisionSubmitting.set(false);
    if (!result.ok) {
      this.decisionFeedback.set(result.message);
      this.decisionFeedbackIsValid.set(false);
      return;
    }
    this.request.set(this.reservationService.getReservation(this.code));
    this.decisionFeedback.set('Devolución autorizada correctamente.');
    this.decisionFeedbackIsValid.set(true);
    this.decisionDone.set(true);
  }

  async reject(): Promise<void> {
    if (this.decisionDone()) return;
    const note = this.decisionNote().trim();
    if (!note) {
      this.decisionFeedback.set('Registra el motivo del rechazo.');
      this.decisionFeedbackIsValid.set(false);
      return;
    }
    this.decisionSubmitting.set(true);
    const result = await this.reservationService.rejectRefund(this.code, note);
    this.decisionSubmitting.set(false);
    if (!result.ok) {
      this.decisionFeedback.set(result.message);
      this.decisionFeedbackIsValid.set(false);
      return;
    }
    this.request.set(this.reservationService.getReservation(this.code));
    this.decisionFeedback.set('Devolución rechazada correctamente.');
    this.decisionFeedbackIsValid.set(true);
    this.decisionDone.set(true);
  }

  async registerExecution(): Promise<void> {
    const outflow = this.outflow();
    if (!outflow) {
      this.executeFeedback.set('Indica si hubo salida efectiva de dinero.');
      this.executeFeedbackIsValid.set(false);
      return;
    }
    this.executeSubmitting.set(true);
    // NO se marca "Ejecutada" si no hubo salida real de dinero (RF-015B): en ese caso el
    // resultado queda como saldo a favor pendiente. La salida real de dinero
    // (POST .../refund) ya se registro al crear la solicitud (Fase 14/manage-refund); aqui
    // solo se resuelve como saldo a favor cuando NO hubo salida.
    const result =
      outflow === 'si'
        ? { ok: true as const }
        : await this.reservationService.registerRefundAsCreditBalance(this.code);
    this.executeSubmitting.set(false);
    if (!result.ok) {
      this.executeFeedback.set(result.message);
      this.executeFeedbackIsValid.set(false);
      return;
    }
    this.request.set(this.reservationService.getReservation(this.code));
    this.executeFeedback.set(
      outflow === 'si' ? 'La devolución ya quedó registrada como ejecutada (salida de dinero real).' : 'Registrado como saldo a favor pendiente: no hubo salida efectiva de dinero.',
    );
    this.executeFeedbackIsValid.set(true);
    this.executeDone.set(true);
  }
}
