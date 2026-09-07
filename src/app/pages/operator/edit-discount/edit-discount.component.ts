import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DiscountApiService, DiscountBase, DiscountResponse } from '../../../core/discount-api.service';
import { CatalogApiService } from '../../../core/catalog-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../../core/http-error.util';
import { parseCOPToNumberOrNull } from '../../../core/money.util';
import { SessionService } from '../../../core/session.service';

const parseCapAmount = parseCOPToNumberOrNull;

@Component({
  selector: 'app-operator-edit-discount',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './edit-discount.component.html',
  styleUrl: './edit-discount.component.css',
})
export class EditDiscountComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly discountApi = inject(DiscountApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly sessionService = inject(SessionService);

  readonly id = this.route.snapshot.queryParamMap.get('id') || '';

  loading = signal(true);
  notFound = signal(false);
  serviceLabel = signal('');
  discount: DiscountResponse | null = null;

  feedback = signal('Actualiza los parámetros y guarda para aplicar los cambios a este mismo descuento.');
  submitting = signal(false);

  ngOnInit(): void {
    const tenantId = this.sessionService.tenantId();
    if (!this.id || !tenantId) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }
    this.discountApi.getById(tenantId, this.id).subscribe({
      next: (discount) => {
        this.discount = discount;
        this.catalogApi.getById(tenantId, discount.catalogItemId).subscribe({
          next: (item) => this.serviceLabel.set(item.name),
          error: () => this.serviceLabel.set(discount.catalogItemId),
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
        this.feedback.set('No se encontró el descuento seleccionado. Vuelve a Descuentos e ingresa nuevamente por Editar parámetros.');
      },
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.notFound() || !this.discount) return;
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) return;

    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const start = String(data.get('start') || '');
    const end = String(data.get('end') || '');
    const percentageValue = String(data.get('percentage') || '');
    const priorityValue = String(data.get('priority') || '');
    const baseValue = String(data.get('base') || '');
    const percentage = Number(percentageValue);
    const missingRequired = !start || !end || !priorityValue || !percentageValue || !baseValue;
    if (missingRequired || !form.checkValidity() || percentage < 0 || percentage > 100 || end < start) {
      this.feedback.set(
        'Completa vigencia desde, vigencia hasta, prioridad, porcentaje y base de cálculo (el porcentaje entre 0 y 100, y la vigencia hasta no anterior a la vigencia desde) antes de guardar.',
      );
      return;
    }

    this.submitting.set(true);
    this.feedback.set('Guardando...');
    this.discountApi
      .update(tenantId, this.discount.discountId, {
        percentage,
        validFrom: start,
        validTo: end,
        priority: Number(priorityValue),
        stackable: String(data.get('stackable') || 'no') === 'si',
        cap: parseCapAmount(String(data.get('cap') || '')),
        base: baseValue as DiscountBase,
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
    if (error.status === 404) return 'El descuento ya no existe.';
    if (error.status === 409) return 'El operador está inactivo; no admite cambios de descuentos.';
    if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
    return 'No fue posible guardar los cambios.';
  }
}
