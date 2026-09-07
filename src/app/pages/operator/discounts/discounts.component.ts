import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DiscountApiService, DiscountResponse } from '../../../core/discount-api.service';
import { CatalogApiService } from '../../../core/catalog-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../../core/http-error.util';
import { SessionService } from '../../../core/session.service';

interface DiscountRow {
  discountId: string;
  serviceLabel: string;
  percentage: number;
  validTo: string;
  baseLabel: string;
  priority: number;
  stackable: boolean;
  cap: number | null;
  active: boolean;
}

@Component({
  selector: 'app-operator-discounts',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './discounts.component.html',
  styleUrl: './discounts.component.css',
})
export class DiscountsComponent implements OnInit {
  private readonly discountApi = inject(DiscountApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  private readonly discountsSignal = signal<DiscountResponse[]>([]);
  private readonly catalogNameByIdSignal = signal<Map<string, string>>(new Map());
  loading = signal(true);
  error = signal('');

  discounts = computed<DiscountRow[]>(() =>
    this.discountsSignal().map((discount) => ({
      discountId: discount.discountId,
      serviceLabel: this.catalogNameByIdSignal().get(discount.catalogItemId) || discount.catalogItemId,
      percentage: discount.percentage,
      validTo: discount.validTo,
      baseLabel: discount.base === 'subtotal' ? 'subtotal resultante del descuento anterior' : 'valor original',
      priority: discount.priority,
      stackable: discount.stackable,
      cap: discount.cap,
      active: discount.active,
    })),
  );
  totalActive = computed(() => this.discounts().filter((d) => d.active).length);

  ngOnInit(): void {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) {
      this.loading.set(false);
      this.error.set('No hay una sesión activa.');
      return;
    }
    forkJoin({
      discounts: this.discountApi.listByTenant(tenantId),
      catalog: this.catalogApi.listByTenant(tenantId),
    }).subscribe({
      next: ({ discounts, catalog }) => {
        this.discountsSignal.set(discounts);
        this.catalogNameByIdSignal.set(new Map(catalog.map((item) => [item.catalogItemId, item.name])));
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(isNetworkError(err) ? NETWORK_ERROR_MESSAGE : 'No fue posible cargar los descuentos.');
        this.loading.set(false);
      },
    });
  }

  editDiscount(id: string): void {
    this.router.navigate(['/operator/discounts/edit'], { queryParams: { id } });
  }
}
