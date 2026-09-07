import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstablishmentApiService, EstablishmentResponse } from '../../../core/establishment-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../../core/http-error.util';
import { SessionService } from '../../../core/session.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-manage-restaurants',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './manage-restaurants.component.html',
  styleUrl: './manage-restaurants.component.css',
})
export class ManageRestaurantsComponent implements OnInit {
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly sessionService = inject(SessionService);
  readonly roleService = inject(OperatorRoleService);

  private readonly itemsSignal = signal<EstablishmentResponse[]>([]);
  loading = signal(true);
  error = signal('');

  restaurants = computed(() => this.itemsSignal().filter((item) => item.kind === 'RESTAURANT'));

  ngOnInit(): void {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) {
      this.loading.set(false);
      this.error.set('No hay una sesión activa.');
      return;
    }
    this.establishmentApi.listByTenant(tenantId).subscribe({
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

  toggle(establishmentId: string, currentlyActive: boolean): void {
    if (this.roleService.isColaborador()) return;
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) return;

    const request$ = currentlyActive
      ? this.establishmentApi.deactivate(tenantId, establishmentId)
      : this.establishmentApi.reactivate(tenantId, establishmentId);

    request$.subscribe({
      next: (updated) => {
        this.itemsSignal.set(
          this.itemsSignal().map((item) => (item.establishmentId === updated.establishmentId ? updated : item)),
        );
      },
      error: (err: HttpErrorResponse) => this.error.set(this.mapError(err)),
    });
  }

  private mapError(error: HttpErrorResponse): string {
    if (error.status === 404) return 'El establecimiento no existe o fue eliminado.';
    if (error.status === 409) return 'El operador está inactivo; no admite cambios.';
    if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
    return 'No fue posible cargar o actualizar los restaurantes asociados.';
  }
}
