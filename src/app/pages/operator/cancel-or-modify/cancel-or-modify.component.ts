import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OperatorReservation, OperatorReservationService } from '../operator-reservation.service';
import { CatalogApiService, CatalogItemResponse } from '../../../core/catalog-api.service';
import { formatCOP } from '../../../core/money.util';
import { SessionService } from '../../../core/session.service';

@Component({
  selector: 'app-operator-cancel-or-modify',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cancel-or-modify.component.html',
  styleUrl: './cancel-or-modify.component.css',
})
export class CancelOrModifyReservationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reservationService = inject(OperatorReservationService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly sessionService = inject(SessionService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  loading = signal(true);
  reservation = signal<OperatorReservation | undefined>(undefined);
  services = signal<CatalogItemResponse[]>([]);

  ineligible = computed(() => {
    const r = this.reservation();
    return Boolean(r) && !this.reservationService.isEligibleForCancelOrModify(r!.statusClass);
  });
  notFound = computed(() => !this.loading() && !this.reservation());
  // En ejecucion no se permiten ajustes ordinarios: solo cancelacion extraordinaria
  // por emergencia (RF-008A, linea 463/729, CA-008A).
  isInExecution = computed(() => this.reservation()?.statusClass === 'is-execution');

  type = signal<'' | 'Cancelación' | 'Modificación'>('');
  causal = signal('');
  done = signal(false);
  submitting = signal(false);

  serviceKey = signal('');
  departure = signal('');
  travelers = signal(1);

  feedback = signal('Completa la novedad para registrar la cancelación o modificación.');
  feedbackIsValid = signal(false);

  disabled = computed(() => this.notFound() || this.ineligible() || this.done() || this.submitting());
  isModification = computed(() => this.type() === 'Modificación');

  selectedService = computed(() => this.services().find((s) => s.catalogItemId === this.serviceKey()) || null);

  projected = computed(() => {
    const service = this.selectedService();
    return service ? service.price * this.travelers() : 0;
  });
  projectedLabel = computed(() => formatCOP(this.projected()));

  async ngOnInit(): Promise<void> {
    const tenantId = this.sessionService.tenantId();
    await this.reservationService.refresh();
    this.reservation.set(this.reservationService.getReservation(this.code));
    this.travelers.set(this.reservation()?.travelers || 1);
    if (this.isInExecution()) this.type.set('Cancelación');

    if (!this.reservation()) {
      this.feedback.set('No se encontró la reserva seleccionada.');
    } else if (this.ineligible()) {
      this.feedback.set(`Esta reserva está en estado "${this.reservation()!.status}" y ya no admite cancelación o modificación.`);
    }

    if (tenantId) {
      this.catalogApi.listByTenant(tenantId).subscribe((items) => this.services.set(items.filter((i) => i.active)));
    }
    this.loading.set(false);
  }

  onServiceChange(value: string): void {
    this.serviceKey.set(value);
  }

  onTravelersChange(value: string): void {
    this.travelers.set(Math.max(1, Number.parseInt(value, 10) || 1));
  }

  async register(): Promise<void> {
    if (this.disabled() || !this.reservation()) return;
    const type = this.type();
    const causal = this.causal().trim();
    if (!type || !causal) {
      this.feedback.set('Completa el tipo y la causal de la cancelación o modificación.');
      this.feedbackIsValid.set(false);
      return;
    }
    if (this.isInExecution() && type !== 'Cancelación') {
      this.feedback.set('Esta reserva está en ejecución: solo se permite registrar una cancelación extraordinaria por emergencia.');
      this.feedbackIsValid.set(false);
      return;
    }

    this.submitting.set(true);
    this.feedback.set('Registrando...');

    if (type === 'Cancelación') {
      const result = await this.reservationService.cancel(this.code, causal);
      this.submitting.set(false);
      if (!result.ok) {
        this.feedback.set(result.message);
        this.feedbackIsValid.set(false);
        return;
      }
      this.feedback.set('Cancelación registrada.');
    } else {
      const service = this.selectedService();
      if (!service || !this.departure()) {
        this.submitting.set(false);
        this.feedback.set('Selecciona el nuevo servicio y la nueva fecha de salida para registrar la modificación.');
        this.feedbackIsValid.set(false);
        return;
      }
      const result = await this.reservationService.modify(
        this.code,
        [{ serviceReference: service.catalogItemId, partySize: this.travelers(), scheduledDate: this.departure(), transportItemId: null }],
        this.projected(),
        causal,
      );
      this.submitting.set(false);
      if (!result.ok) {
        this.feedback.set(result.message);
        this.feedbackIsValid.set(false);
        return;
      }
      this.feedback.set('Modificación registrada y valores recalculados.');
    }

    this.feedbackIsValid.set(true);
    this.done.set(true);
    window.setTimeout(() => {
      this.router.navigate(['/operator/reservations/detail'], { queryParams: { reservation: this.code } });
    }, 1400);
  }
}
