import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorRefundService, RefundRequest } from '../operator-refund.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-refund-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './refund-detail.component.html',
  styleUrl: './refund-detail.component.css',
})
export class RefundDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly refundService = inject(OperatorRefundService);
  private readonly roleService = inject(OperatorRoleService);

  private get ACTOR(): string {
    return this.roleService.roleLabel();
  }

  readonly id = this.route.snapshot.queryParamMap.get('id') || '';

  request = signal<RefundRequest | undefined>(this.refundService.getRequest(this.id));
  notFound = computed(() => !this.request());

  // No existe en el PDR ninguna formula/tabla parametrizada para calcular el valor a
  // devolver: mientras el monto quede "pendiente de calculo", NO se puede autorizar,
  // pero SI puede rechazarse por causal administrativa (no requiere un monto).
  isPendingCalculation = computed(() => Boolean(this.request()?.pendingCalculation));
  isPendingAuthorization = computed(() => this.request()?.status === 'Pendiente de autorización');
  // Regla (PDR linea 566/689): solo el Administrador del operador autoriza o rechaza una
  // devolucion. El Colaborador operativo nunca ve este panel, solo puede registrar la
  // ejecucion cuando ya exista autorizacion previa (showExecute, sin restriccion de rol).
  showDecisionPanel = computed(() => this.roleService.isAdmin() && this.isPendingAuthorization());
  // "Autorizar devolucion" permanece visible siempre (es la decision del Administrador
  // del tenant): solo se deshabilita mientras el monto siga pendiente de parametrizacion.
  authorizeDisabled = computed(() => this.isPendingCalculation() || this.decisionDone());
  authorizeTitle = computed(() =>
    this.isPendingCalculation() ? 'Falta determinar el monto según la condición comercial parametrizada antes de poder autorizar.' : '',
  );
  showExecute = computed(() => this.request()?.status === 'Autorizada');

  decisionNote = signal('');
  decisionFeedback = signal('Registra el motivo y decide si autorizas o rechazas la devolución.');
  decisionFeedbackIsValid = signal(false);
  decisionDone = signal(false);

  outflow = signal<'' | 'si' | 'no'>('');
  exitMethod = signal('Transferencia');
  cashMovementRef = signal('');
  executeFeedback = signal('Registra la ejecución de la devolución autorizada.');
  executeFeedbackIsValid = signal(false);
  executeDone = signal(false);

  // Regla 1: solo el Administrador del operador (Tenant Admin) autoriza o rechaza.
  authorize(): void {
    const request = this.request();
    if (!request || this.authorizeDisabled()) return;
    const note = this.decisionNote().trim();
    if (!note) {
      this.decisionFeedback.set('Registra el motivo para autorizar la devolución.');
      this.decisionFeedbackIsValid.set(false);
      return;
    }
    const updated = this.refundService.authorize(request.id, note, this.ACTOR);
    if (!updated) return;
    this.request.set(updated);
    this.decisionFeedback.set('Devolución autorizada correctamente.');
    this.decisionFeedbackIsValid.set(true);
    this.decisionDone.set(true);
  }

  reject(): void {
    const request = this.request();
    if (!request || this.decisionDone()) return;
    const note = this.decisionNote().trim();
    if (!note) {
      this.decisionFeedback.set('Registra el motivo del rechazo.');
      this.decisionFeedbackIsValid.set(false);
      return;
    }
    const updated = this.refundService.reject(request.id, note, this.ACTOR);
    if (!updated) return;
    this.request.set(updated);
    this.decisionFeedback.set('Devolución rechazada correctamente.');
    this.decisionFeedbackIsValid.set(true);
    this.decisionDone.set(true);
  }

  registerExecution(): void {
    const request = this.request();
    if (!request) return;
    const outflow = this.outflow();
    if (!outflow) {
      this.executeFeedback.set('Indica si hubo salida efectiva de dinero.');
      this.executeFeedbackIsValid.set(false);
      return;
    }
    // NO se marca "Ejecutada" si no hubo salida real de dinero (RF-015B): en ese caso
    // el resultado queda como saldo a favor pendiente.
    let updated: RefundRequest | null;
    if (outflow === 'si') {
      const cashMovementRef = this.cashMovementRef().trim();
      if (!cashMovementRef) {
        this.executeFeedback.set('Registra el movimiento de caja asociado a la salida de dinero.');
        this.executeFeedbackIsValid.set(false);
        return;
      }
      updated = this.refundService.executeWithOutflow(request.id, this.exitMethod(), cashMovementRef, this.ACTOR);
      if (updated) this.executeFeedback.set('Ejecución registrada correctamente.');
    } else {
      updated = this.refundService.registerAsCreditBalance(request.id, this.ACTOR);
      if (updated) this.executeFeedback.set('Registrado como saldo a favor pendiente: no hubo salida efectiva de dinero.');
    }
    if (!updated) return;
    this.request.set(updated);
    this.executeFeedbackIsValid.set(true);
    this.executeDone.set(true);
  }
}
