import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../operator-catalog.service';
import { OperatorRoleService } from '../operator-role.service';

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
export class CatalogComponent {
  private readonly catalogService = inject(OperatorCatalogService);
  readonly roleService = inject(OperatorRoleService);

  toursActiveCount = computed(() => this.catalogService.activeCount('catalogo-catalog-panel'));
  lodgingActiveCount = computed(() => this.catalogService.activeCount('hospedaje-catalog-panel'));
  foodActiveCount = computed(() => this.catalogService.activeCount('alimentacion-catalog-panel'));

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
    for (const resource of this.catalogService.newServices()) {
      const typeLabels: Record<string, string> = { tour: 'Actividad principal', lodging: 'Hospedaje', food: 'Alimentación', transport: 'Transporte' };
      rows.push({ name: resource.name, type: typeLabels[resource.type] || 'Servicio', policy: resource.policy, validity: `${resource.start} - ${resource.end}`, active: resource.active });
    }
    return rows;
  });
}
