import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlatformDataService, PlatformTenant } from '../platform-data.service';

@Component({
  selector: 'app-platform-tenant-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './tenant-detail.component.html',
  styleUrl: './tenant-detail.component.css',
})
export class TenantDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly platformData = inject(PlatformDataService);

  private readonly tenantId = this.route.snapshot.paramMap.get('tenantId') || '';

  tenant = signal<PlatformTenant | null>(null);
  loading = signal(true);
  notFound = signal(false);

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
  submitting = signal(false);

  async ngOnInit(): Promise<void> {
    // Reutiliza el cache si ya se cargo el listado (venir desde /platform/operators);
    // si se entra directo por URL, se pide el detalle real a la API.
    const cached = this.platformData.findTenant(this.tenantId);
    if (cached) {
      this.tenant.set(cached);
      this.loading.set(false);
      return;
    }
    const fetched = await this.platformData.fetchTenant(this.tenantId);
    this.loading.set(false);
    if (fetched) {
      this.tenant.set(fetched);
    } else {
      this.notFound.set(true);
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const reason = String(new FormData(form).get('reason') || '').trim();
    const tenant = this.tenant();
    if (!tenant) return;
    if (!reason) {
      this.setFeedback('Registra el motivo para conservar la trazabilidad del cambio.', true);
      return;
    }

    this.submitting.set(true);
    this.setFeedback('Guardando...', false);
    const action = this.isActive() ? 'deactivate' : 'reactivate';
    const result = await this.platformData.setTenantStatus(tenant.id, action, reason);
    this.submitting.set(false);

    if (!result.ok) {
      this.setFeedback(result.message, true);
      return;
    }
    this.tenant.set(result.tenant);
    form.reset();
    this.setFeedback(`Operador ${this.isActive() ? 'activo' : 'inactivo'} actualizado.`, false);
  }

  private setFeedback(message: string, isError: boolean): void {
    this.feedback.set(message);
    this.feedbackIsError.set(isError);
  }
}
