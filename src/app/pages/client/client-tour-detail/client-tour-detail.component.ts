import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogItemResponse } from '../../../core/catalog-api.service';
import { GetCatalogForBookingUseCase } from '../../../core/catalog/application/get-catalog-for-booking.use-case';
import { CURRENT_TENANT_ID } from '../../../core/tenant.constants';
import { formatOperatorDate } from '../client-tour-catalog.service';

@Component({
  selector: 'app-client-tour-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './client-tour-detail.component.html',
  styleUrl: './client-tour-detail.component.css',
})
export class ClientTourDetailComponent implements OnInit {
  private readonly getCatalogForBooking = inject(GetCatalogForBookingUseCase);
  private readonly route = inject(ActivatedRoute);

  tenantName = computed(() => '[Tu Marca]');

  readonly itemIdParam = this.route.snapshot.queryParamMap.get('id') || '';

  private readonly loadingSignal = signal(true);
  private readonly loadErrorSignal = signal(false);
  private readonly tourSignal = signal<CatalogItemResponse | null>(null);

  loading = this.loadingSignal.asReadonly();
  loadError = this.loadErrorSignal.asReadonly();

  // Se resuelve SIEMPRE desde el Backend real (GET .../catalog-items/{id}); si el id no
  // existe, no responde, o el item no esta activo, se informa en vez de inventar uno de
  // relleno. Campos que el PDR pide para esta pantalla pero que el contrato real todavia
  // no expone (descuento, riesgo, medios de pago, condiciones detalladas, transporte
  // asociado) NO se muestran ni se inventan: ver informe de integracion, seccion "CAMPO
  // TODAVIA SIN RESPALDO API".
  tour = computed<CatalogItemResponse | null>(() => {
    const item = this.tourSignal();
    return item && item.active ? item : null;
  });

  ngOnInit(): void {
    if (!this.itemIdParam) {
      this.loadingSignal.set(false);
      return;
    }
    this.getCatalogForBooking.execute(CURRENT_TENANT_ID, this.itemIdParam).subscribe({
      next: (item) => {
        this.tourSignal.set(item);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.loadErrorSignal.set(true);
        this.loadingSignal.set(false);
      },
    });
  }

  startLabel = computed(() => formatOperatorDate(this.tour()?.validFrom ?? undefined));
  endLabel = computed(() => formatOperatorDate(this.tour()?.validTo ?? undefined));
}
