import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OperatorRoleService } from '../operator-role.service';
import { CatalogApiService, CatalogItemResponse } from '../../../core/catalog-api.service';
import { EstablishmentApiService } from '../../../core/establishment-api.service';
import { SessionService } from '../../../core/session.service';
import { formatValidity } from '../catalog-view.util';

interface SummaryRow {
  name: string;
  type: string;
  policy: string;
  validity: string;
  active: boolean;
  // "Ver detalle" del Colaborador operativo reutiliza la MISMA ruta/componente de
  // Gestionar de cada categoria, filtrando al servicio puntual cuando aplica.
  detailLink?: string;
  detailQueryParams?: { record: string };
}

const DETAIL_LINK_BY_TYPE: Record<string, string> = {
  TOUR: '/operator/catalog/tours',
  LODGING: '/operator/catalog/lodging',
  FOOD: '/operator/catalog/food',
  TRANSPORT: '/operator/catalog/transport',
};

const TYPE_LABEL: Record<string, string> = {
  TOUR: 'Actividad principal',
  LODGING: 'Hospedaje',
  FOOD: 'Alimentación',
  TRANSPORT: 'Transporte',
};

@Component({
  selector: 'app-operator-catalog',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly sessionService = inject(SessionService);
  readonly roleService = inject(OperatorRoleService);

  // Conteos superiores y tabla de detalle: ambos datos REALES del Backend
  // (GET /api/tenants/{tenantId}/catalog-items y /establishments). Fase 6 cierra lo que
  // habia quedado deliberadamente fuera de alcance en el bloque anterior (tabla de
  // detalle todavia en mock) - ver commit 3f009d0.
  private readonly toursActiveCountSignal = signal(0);
  private readonly lodgingActiveCountSignal = signal(0);
  private readonly foodActiveCountSignal = signal(0);
  private readonly transportActiveCountSignal = signal(0);
  private readonly restaurantsActiveCountSignal = signal(0);
  private readonly countsLoadErrorSignal = signal(false);
  private readonly summaryRowsSignal = signal<SummaryRow[]>([]);

  toursActiveCount = this.toursActiveCountSignal.asReadonly();
  lodgingActiveCount = this.lodgingActiveCountSignal.asReadonly();
  foodActiveCount = this.foodActiveCountSignal.asReadonly();
  transportActiveCount = this.transportActiveCountSignal.asReadonly();
  restaurantsActiveCount = this.restaurantsActiveCountSignal.asReadonly();
  countsLoadError = this.countsLoadErrorSignal.asReadonly();
  summaryRows = this.summaryRowsSignal.asReadonly();

  ngOnInit(): void {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) {
      this.countsLoadErrorSignal.set(true);
      return;
    }
    forkJoin({
      catalog: this.catalogApi.listByTenant(tenantId),
      establishments: this.establishmentApi.listByTenant(tenantId),
    }).subscribe({
      next: ({ catalog, establishments }) => {
        const activeByType = (type: string) => catalog.filter((item) => item.type === type && item.active).length;
        this.toursActiveCountSignal.set(activeByType('TOUR'));
        this.lodgingActiveCountSignal.set(activeByType('LODGING'));
        this.foodActiveCountSignal.set(activeByType('FOOD'));
        this.transportActiveCountSignal.set(activeByType('TRANSPORT'));
        this.restaurantsActiveCountSignal.set(establishments.filter((item) => item.kind === 'RESTAURANT' && item.active).length);
        this.summaryRowsSignal.set(catalog.map((item) => this.toSummaryRow(item)));
      },
      error: () => this.countsLoadErrorSignal.set(true),
    });
  }

  private toSummaryRow(item: CatalogItemResponse): SummaryRow {
    return {
      name: item.name,
      type: TYPE_LABEL[item.type] || item.type,
      policy: item.policy || 'No aplica',
      validity: formatValidity(item.validFrom, item.validTo),
      active: item.active,
      detailLink: DETAIL_LINK_BY_TYPE[item.type],
      detailQueryParams: { record: item.catalogItemId },
    };
  }
}
