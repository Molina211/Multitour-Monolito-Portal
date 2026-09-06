import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NEW_SERVICE_CATALOG_ID_BY_TYPE, OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../operator-catalog.service';
import { OperatorRoleService } from '../operator-role.service';
import { CatalogApiService } from '../../../core/catalog-api.service';
import { EstablishmentApiService } from '../../../core/establishment-api.service';
import { CURRENT_TENANT_ID } from '../../../core/tenant.constants';

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

@Component({
  selector: 'app-operator-catalog',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent implements OnInit {
  private readonly catalogService = inject(OperatorCatalogService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  readonly roleService = inject(OperatorRoleService);

  // Conteos superiores (tarjetas resumen): datos REALES del Backend
  // (GET /api/tenants/{tenantId}/catalog-items y /establishments). La tabla de detalle
  // mas abajo y las pantallas "Gestionar <categoria>" siguen usando el catalogo mock:
  // su migracion a la API real queda fuera de alcance de este bloque (Catálogo +
  // Establecimientos de lectura), reportado explicitamente, no resuelto aqui.
  private readonly toursActiveCountSignal = signal(0);
  private readonly lodgingActiveCountSignal = signal(0);
  private readonly foodActiveCountSignal = signal(0);
  private readonly transportActiveCountSignal = signal(0);
  private readonly restaurantsActiveCountSignal = signal(0);
  private readonly countsLoadErrorSignal = signal(false);

  toursActiveCount = this.toursActiveCountSignal.asReadonly();
  lodgingActiveCount = this.lodgingActiveCountSignal.asReadonly();
  foodActiveCount = this.foodActiveCountSignal.asReadonly();
  transportActiveCount = this.transportActiveCountSignal.asReadonly();
  restaurantsActiveCount = this.restaurantsActiveCountSignal.asReadonly();
  countsLoadError = this.countsLoadErrorSignal.asReadonly();

  ngOnInit(): void {
    forkJoin({
      catalog: this.catalogApi.listByTenant(CURRENT_TENANT_ID),
      establishments: this.establishmentApi.listByTenant(CURRENT_TENANT_ID),
    }).subscribe({
      next: ({ catalog, establishments }) => {
        const activeByType = (type: string) => catalog.filter((item) => item.type === type && item.active).length;
        this.toursActiveCountSignal.set(activeByType('TOUR'));
        this.lodgingActiveCountSignal.set(activeByType('LODGING'));
        this.foodActiveCountSignal.set(activeByType('FOOD'));
        this.transportActiveCountSignal.set(activeByType('TRANSPORT'));
        this.restaurantsActiveCountSignal.set(establishments.filter((item) => item.kind === 'RESTAURANT' && item.active).length);
      },
      error: () => this.countsLoadErrorSignal.set(true),
    });
  }

  summaryRows = computed<SummaryRow[]>(() => {
    const rows: SummaryRow[] = [];
    for (const record of OPERATOR_CATALOG_DEFAULTS['catalogo-catalog-panel'].records) {
      rows.push({
        name: record.key,
        type: 'Actividad principal',
        policy: 'Confirmación directa solo con pago válido',
        validity: 'Vigente',
        active: this.catalogService.isActive('catalogo-catalog-panel', record.key, record.active),
        detailLink: '/operator/catalog/tours',
        detailQueryParams: { record: record.key },
      });
    }
    const lodging = OPERATOR_CATALOG_DEFAULTS['hospedaje-catalog-panel'].records[0];
    rows.push({
      name: lodging.key,
      type: 'Hospedaje',
      policy: 'Apartamiento temporal',
      validity: 'Vigente',
      active: this.catalogService.isActive('hospedaje-catalog-panel', lodging.key, lodging.active),
      detailLink: '/operator/catalog/lodging',
    });
    const food = OPERATOR_CATALOG_DEFAULTS['alimentacion-catalog-panel'].records[0];
    rows.push({
      name: food.fields['dish'] || food.key,
      type: 'Alimentación',
      policy: 'Sin apartamiento previo',
      validity: 'Vigente',
      active: this.catalogService.isActive('alimentacion-catalog-panel', food.key, food.active),
      detailLink: '/operator/catalog/food',
    });
    const transport = OPERATOR_CATALOG_DEFAULTS['transporte-catalog-panel'].records[0];
    rows.push({
      name: transport.fields['name'] || transport.key,
      type: 'Transporte',
      policy: transport.fields['policy'] || 'Sin apartamiento previo',
      validity: 'Vigente',
      active: this.catalogService.isActive('transporte-catalog-panel', transport.key, transport.active),
      detailLink: '/operator/catalog/transport',
    });
    const catalogIdRouteByType: Record<string, string> = {
      'catalogo-catalog-panel': '/operator/catalog/tours',
      'hospedaje-catalog-panel': '/operator/catalog/lodging',
      'alimentacion-catalog-panel': '/operator/catalog/food',
      'transporte-catalog-panel': '/operator/catalog/transport',
    };
    for (const resource of this.catalogService.newServices()) {
      const typeLabels: Record<string, string> = { tour: 'Actividad principal', lodging: 'Hospedaje', food: 'Alimentación', transport: 'Transporte' };
      const catalogId = NEW_SERVICE_CATALOG_ID_BY_TYPE[resource.type];
      const detailLink = catalogId ? catalogIdRouteByType[catalogId] : undefined;
      rows.push({
        name: resource.name,
        type: typeLabels[resource.type] || 'Servicio',
        policy: resource.policy,
        validity: `${resource.start} - ${resource.end}`,
        // BUG: antes leia resource.active (fijo desde su creacion); debe reflejar
        // Activar/Desactivar hecho despues sobre este MISMO recurso dinamico.
        active: catalogId ? this.catalogService.isActive(catalogId, resource.id, resource.active) : resource.active,
        detailLink,
        detailQueryParams: detailLink ? { record: resource.id } : undefined,
      });
    }
    return rows;
  });
}
