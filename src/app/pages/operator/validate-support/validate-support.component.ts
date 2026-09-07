import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OperatorReservationService } from '../operator-reservation.service';
import { OperatorRoleService } from '../operator-role.service';
import { PaymentApiService } from '../../../core/payment-api.service';
import { SessionService } from '../../../core/session.service';

@Component({
  selector: 'app-operator-validate-support',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './validate-support.component.html',
  styleUrl: './validate-support.component.css',
})
export class ValidateSupportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reservationService = inject(OperatorReservationService);
  private readonly roleService = inject(OperatorRoleService);
  private readonly paymentApi = inject(PaymentApiService);
  private readonly sessionService = inject(SessionService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  loading = signal(true);

  // Restriccion base (PDR linea 114/554): el Colaborador operativo solo puede validar o
  // rechazar soportes de transferencia cuando el tenant lo habilite expresamente.
  readonly readOnlyForRole = this.roleService.isColaborador() && !this.roleService.collaboratorCanValidateSupport();
  readonly title = this.readOnlyForRole ? 'Ver soporte' : 'Validar soporte';
  readonly heading = this.readOnlyForRole ? 'Consulta del comprobante de pago' : 'Revisa el comprobante antes de decidir';

  supportFilenameLabel = signal('Sin soporte adjunto');
  status = signal('');
  resolved = signal(false);
  notFound = signal(false);
  reason = signal('');
  submitting = signal(false);

  feedback = signal('Registra el motivo y decide si apruebas o rechazas el soporte.');
  feedbackIsValid = signal(false);

  disabled = computed(() => this.notFound() || this.resolved() || this.readOnlyForRole || this.submitting());

  async ngOnInit(): Promise<void> {
    await this.reservationService.refresh();
    const raw = this.reservationService.findRaw(this.code);
    this.loading.set(false);
    if (!raw) {
      this.notFound.set(true);
      this.feedback.set('No se encontró el soporte de pago seleccionado. Vuelve a Pagos e ingresa nuevamente por Validar soporte.');
      return;
    }
    this.supportFilenameLabel.set(raw.transferSupportReference ? `Referencia: ${raw.transferSupportReference}` : 'Sin soporte adjunto');
    this.status.set(raw.paymentStatus);
    if (raw.paymentStatus !== 'En validación') {
      this.resolved.set(true);
      if (this.readOnlyForRole) {
        this.feedback.set('Consulta de solo lectura: el Colaborador operativo no tiene permiso para validar este soporte.');
      } else {
        this.feedback.set(`Este soporte ya fue ${raw.paymentStatus === 'Rechazado' ? 'rechazado' : 'resuelto'}. No se puede volver a decidir sobre el mismo intento.`);
      }
    } else if (this.readOnlyForRole) {
      this.feedback.set('Consulta de solo lectura: el Colaborador operativo no tiene permiso para validar este soporte.');
    }
  }

  decide(action: 'approve' | 'reject'): void {
    if (this.disabled()) return;
    const reason = this.reason().trim();
    if (!reason) {
      this.feedback.set('Registra el motivo obligatorio antes de aprobar o rechazar el soporte.');
      this.feedbackIsValid.set(false);
      return;
    }
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    if (!tenantId || !actorId) return;

    this.submitting.set(true);
    this.paymentApi.decideSupport(tenantId, this.code, { decision: action === 'approve' ? 'APPROVE' : 'REJECT', reason, actorId }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.feedback.set(action === 'approve' ? 'Soporte aprobado correctamente.' : 'Soporte rechazado correctamente.');
        this.feedbackIsValid.set(true);
        this.resolved.set(true);
        window.setTimeout(() => this.router.navigateByUrl('/operator/payments'), 1400);
      },
      error: (err) => {
        this.submitting.set(false);
        this.feedback.set(err?.error?.message || 'No fue posible registrar la decisión.');
        this.feedbackIsValid.set(false);
      },
    });
  }
}
