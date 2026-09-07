import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogApiService, CatalogItemResponse } from '../../../core/catalog-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../../core/http-error.util';
import { SessionService } from '../../../core/session.service';
import { OperatorRoleService } from '../operator-role.service';
import { formatCurrency, formatValidity } from '../catalog-view.util';
import { ManageCatalogRow } from '../manage-catalog/manage-catalog.component';

@Component({
  selector: 'app-operator-manage-transport',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './manage-transport.component.html',
  styleUrl: './manage-transport.component.css',
})
export class ManageTransportComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly sessionService = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  readonly roleService = inject(OperatorRoleService);

  private readonly recordId = this.route.snapshot.queryParamMap.get('record') || '';

  private readonly itemsSignal = signal<CatalogItemResponse[]>([]);
  loading = signal(true);
  error = signal('');

  records = computed<ManageCatalogRow[]>(() => {
    const transport = this.itemsSignal().filter((item) => item.type === 'TRANSPORT');
    const scoped = this.recordId ? transport.filter((item) => item.catalogItemId === this.recordId) : transport;
    return scoped.map((item) => ({
      catalogItemId: item.catalogItemId,
      active: item.active,
      fields: {
        name: item.name,
        route: item.route || 'Por configurar',
        capacity: item.capacity != null ? String(item.capacity) : 'Por configurar',
        tariff: formatCurrency(item.price),
        cost: formatCurrency(item.operationalCost),
        policy: item.policy || 'No aplica',
        validity: formatValidity(item.validFrom, item.validTo),
      },
    }));
  });

  ngOnInit(): void {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) {
      this.loading.set(false);
      this.error.set('No hay una sesión activa.');
      return;
    }
    this.catalogApi.listByTenant(tenantId).subscribe({
      next: (items) => {
        this.itemsSignal.set(items);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.mapError(err));
        this.loading.set(false);
      },
    });
  }

  toggle(catalogItemId: string, currentlyActive: boolean): void {
    if (this.roleService.isColaborador()) return;
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) return;

    const request$ = currentlyActive
      ? this.catalogApi.deactivate(tenantId, catalogItemId)
      : this.catalogApi.reactivate(tenantId, catalogItemId);

    request$.subscribe({
      next: (updated) => {
        this.itemsSignal.set(
          this.itemsSignal().map((item) => (item.catalogItemId === updated.catalogItemId ? updated : item)),
        );
      },
      error: (err: HttpErrorResponse) => this.error.set(this.mapError(err)),
    });
  }

  private mapError(error: HttpErrorResponse): string {
    if (error.status === 404) return 'El servicio no existe o fue eliminado.';
    if (error.status === 409) return 'El operador está inactivo; no admite cambios de catálogo.';
    if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
    return 'No fue posible cargar o actualizar el catálogo.';
  }
}
