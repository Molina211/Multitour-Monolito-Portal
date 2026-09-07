import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogApiService, CatalogItemResponse } from '../../../core/catalog-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../../core/http-error.util';
import { parseCOPToNumberOrNull } from '../../../core/money.util';
import { SessionService } from '../../../core/session.service';
import { OperatorRoleService } from '../operator-role.service';

const parseAmount = parseCOPToNumberOrNull;

@Component({
  selector: 'app-operator-configure-transport',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './configure-transport.component.html',
  styleUrl: './configure-transport.component.css',
})
export class ConfigureTransportComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly sessionService = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly roleService = inject(OperatorRoleService);

  private readonly catalogItemId = this.route.snapshot.queryParamMap.get('item') || '';
  private item: CatalogItemResponse | null = null;

  loading = signal(true);
  notFound = signal(false);

  name = signal('');
  route$ = signal('');
  tariff = signal('');
  cost = signal('');
  capacity = signal('');
  policy = signal('Sin apartamiento previo');
  validityStart = signal('');
  validityEnd = signal('');

  isActive = false;
  feedback = signal('Los cambios se guardan sobre este mismo recurso; no se crea uno nuevo.');
  feedbackIsError = signal(false);
  submitting = signal(false);

  readonly readOnly = this.roleService.isColaborador();

  ngOnInit(): void {
    const tenantId = this.sessionService.tenantId();
    if (!this.catalogItemId || !tenantId) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }
    this.catalogApi.getById(tenantId, this.catalogItemId).subscribe({
      next: (item) => {
        this.item = item;
        this.isActive = item.active;
        this.name.set(item.name || '');
        this.route$.set(item.route || '');
        this.tariff.set(item.price != null ? String(item.price) : '');
        this.cost.set(item.operationalCost != null ? String(item.operationalCost) : '');
        this.capacity.set(item.capacity != null ? String(item.capacity) : '');
        this.policy.set(item.policy || 'Sin apartamiento previo');
        this.validityStart.set(item.validFrom || '');
        this.validityEnd.set(item.validTo || '');
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.readOnly || !this.item) return;

    const tenantId = this.sessionService.tenantId();
    if (!tenantId) return;

    const name = this.name().trim();
    if (!name) {
      this.setFeedback('El nombre del recurso es obligatorio.', true);
      return;
    }
    const capacityValue = parseAmount(this.capacity());
    if (capacityValue == null) {
      this.setFeedback('La capacidad es obligatoria.', true);
      return;
    }

    this.submitting.set(true);
    this.setFeedback('Guardando...', false);

    this.catalogApi
      .update(tenantId, this.catalogItemId, {
        name,
        route: this.route$().trim() || null,
        capacity: capacityValue,
        price: parseAmount(this.tariff()) ?? undefined,
        operationalCost: parseAmount(this.cost()),
        policy: this.policy(),
        validFrom: this.validityStart() || null,
        validTo: this.validityEnd() || null,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.setFeedback('Cambios guardados.', false);
          window.setTimeout(() => this.router.navigateByUrl('/operator/catalog/transport'), 600);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.setFeedback(this.mapError(err), true);
        },
      });
  }

  private mapError(error: HttpErrorResponse): string {
    if (error.status === 400) return error.error?.message || 'Revisa los datos ingresados.';
    if (error.status === 404) return 'El recurso ya no existe.';
    if (error.status === 409) return 'El operador está inactivo; no admite cambios de catálogo.';
    if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
    return 'No fue posible guardar los cambios.';
  }

  private setFeedback(message: string, isError: boolean): void {
    this.feedback.set(message);
    this.feedbackIsError.set(isError);
  }
}
