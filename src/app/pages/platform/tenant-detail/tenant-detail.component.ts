import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PLATFORM_OPERATORS_MODULE, PlatformDataService } from '../platform-data.service';

function formatPlatformDateTime(date: Date): string {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const datePart = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  return `${datePart}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-platform-tenant-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './tenant-detail.component.html',
  styleUrl: './tenant-detail.component.css',
})
export class TenantDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly platformData = inject(PlatformDataService);

  private readonly tenantId = signal(this.route.snapshot.paramMap.get('tenantId') || '');

  tenant = computed(() => this.platformData.findTenant(this.tenantId()) ?? this.platformData.tenants()[0]);
  isActive = computed(() => this.tenant()?.status === 'Activo');

  reasonLabel = computed(() => (this.isActive() ? 'Motivo de la inactivación' : 'Motivo de la reactivación'));
  reasonPlaceholder = computed(() =>
    this.isActive() ? 'Ingresa el motivo obligatorio para inactivar el operador.' : 'Ingresa el motivo obligatorio para reactivar el operador.',
  );
  stateHeading = computed(() => (this.isActive() ? 'Operador activo' : 'Operador inactivo'));
  stateCopy = computed(() =>
    this.isActive()
      ? 'Puede recibir nuevas autenticaciones y reservas dentro de su propio tenant.'
      : 'No recibe nuevas autenticaciones ni reservas; su historial y auditoria se conservan.',
  );
  submitLabel = computed(() => (this.isActive() ? 'Inactivar operador' : 'Reactivar operador'));

  feedback = signal('');
  feedbackIsError = signal(false);

  onSubmit(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const reason = String(new FormData(form).get('reason') || '').trim();
    const tenant = this.tenant();
    if (!tenant) return;
    if (!reason) {
      this.setFeedback('Registra el motivo para conservar la trazabilidad del cambio.', true);
      return;
    }
    const previousStatus = tenant.status;
    const nextStatus = previousStatus === 'Activo' ? 'Inactivo' : 'Activo';
    this.platformData.updateTenantStatus(tenant.id, nextStatus);
    this.platformData.addAuditEvent({
      date: formatPlatformDateTime(new Date()),
      action: nextStatus === 'Activo' ? 'Operador reactivado' : 'Operador inactivado',
      tenant: tenant.name,
      tenantId: tenant.id,
      detail: `${previousStatus} -> ${nextStatus}`,
      actorName: 'Fernanda Robayo',
      actorRole: 'Administrador de plataforma',
      reason,
      recordAffected: `Estado del operador: ${tenant.id}`,
      previousValue: previousStatus,
      newValue: nextStatus,
      module: PLATFORM_OPERATORS_MODULE,
      functionalReference: 'Cambio de estado de operador',
    });
    form.reset();
    this.setFeedback(`Operador ${nextStatus.toLowerCase()} en esta simulacion.`, false);
  }

  private setFeedback(message: string, isError: boolean): void {
    this.feedback.set(message);
    this.feedbackIsError.set(isError);
  }
}
