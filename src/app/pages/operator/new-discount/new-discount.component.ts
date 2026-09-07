import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DiscountApiService, DiscountBase } from '../../../core/discount-api.service';
import { CatalogApiService, CatalogItemResponse } from '../../../core/catalog-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../../core/http-error.util';
import { parseCOPToNumberOrNull } from '../../../core/money.util';
import { SessionService } from '../../../core/session.service';

const parseCapAmount = parseCOPToNumberOrNull;

@Component({
  selector: 'app-operator-new-discount',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './new-discount.component.html',
  styleUrl: './new-discount.component.css',
})
export class NewDiscountComponent implements OnInit {
  private readonly discountApi = inject(DiscountApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  catalogItems = signal<CatalogItemResponse[]>([]);
  loading = signal(true);
  feedback = signal('Completa los parámetros para publicar el descuento.');
  submitting = signal(false);

  ngOnInit(): void {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) {
      this.loading.set(false);
      this.feedback.set('No hay una sesión activa.');
      return;
    }
    this.catalogApi.listByTenant(tenantId).subscribe({
      next: (items) => {
        this.catalogItems.set(items.filter((item) => item.active));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.feedback.set('No fue posible cargar el catálogo para asociar el descuento.');
      },
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) {
      this.feedback.set('No hay una sesión activa.');
      return;
    }
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const start = String(data.get('start') || '');
    const end = String(data.get('end') || '');
    const catalogItemId = String(data.get('service') || '');
    if (!form.checkValidity() || end < start || !catalogItemId) {
      this.feedback.set('Completa los parámetros y define una vigencia válida.');
      return;
    }

    this.submitting.set(true);
    this.feedback.set('Publicando...');
    this.discountApi
      .create(tenantId, {
        catalogItemId,
        percentage: Number(data.get('percentage') || 0),
        validFrom: start,
        validTo: end,
        priority: Number(data.get('priority') || 0),
        stackable: String(data.get('stackable') || 'no') === 'si',
        cap: parseCapAmount(String(data.get('cap') || '')),
        base: (String(data.get('base') || 'original') as DiscountBase),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.router.navigateByUrl('/operator/discounts');
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.feedback.set(this.mapError(err));
        },
      });
  }

  private mapError(error: HttpErrorResponse): string {
    if (error.status === 400) return error.error?.message || 'Revisa los datos ingresados.';
    if (error.status === 404) return 'El servicio seleccionado ya no existe.';
    if (error.status === 409) return 'El operador está inactivo; no admite altas de descuentos.';
    if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
    return 'No fue posible crear el descuento.';
  }
}
