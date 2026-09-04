import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogRecordDefault, OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../operator-catalog.service';
import { OperatorRoleService } from '../operator-role.service';

const CATALOG_ID = 'catalogo-catalog-panel';

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

@Component({
  selector: 'app-operator-manage-catalog',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './manage-catalog.component.html',
  styleUrl: './manage-catalog.component.css',
})
export class ManageCatalogComponent {
  private readonly catalogService = inject(OperatorCatalogService);
  private readonly route = inject(ActivatedRoute);
  readonly roleService = inject(OperatorRoleService);

  // "Ver detalle" del Colaborador operativo reutiliza esta MISMA ruta/componente,
  // filtrando al servicio puntual mediante el mismo parametro "record" ya usado en la
  // landing aprobada (admin-configurar-catalogo.html?record=...).
  private readonly recordKey = this.route.snapshot.queryParamMap.get('record') || '';

  // Regla: "Ver detalle" tambien debe abrir servicios creados posteriormente por el
  // Administrador (Nuevo servicio), no solo los 4 tours base ya aprobados. Se reutiliza el
  // MISMO listado, sin pantalla nueva.
  private readonly dynamicResource = this.recordKey
    ? this.catalogService.newServices().find((resource) => resource.id === this.recordKey && resource.type === 'tour')
    : undefined;

  // BUG corregido: la tabla solo mostraba OPERATOR_CATALOG_DEFAULTS (los 4 tours base
  // hardcodeados) cuando no hay "record" en la URL, ignorando los tours creados despues en
  // Nuevo servicio. Ahora sale de la MISMA fuente que el contador de "Catálogos"
  // (OperatorCatalogService.activeCount): base + dinamicos reales.
  records: CatalogRecordDefault[] = this.dynamicResource
    ? [
        {
          key: this.dynamicResource.id,
          active: this.dynamicResource.active,
          typeLabel: 'Actividad principal',
          fields: {
            name: this.dynamicResource.name,
            tariff: formatCurrency(this.dynamicResource.price),
            validity: `${this.dynamicResource.start} - ${this.dynamicResource.end}`,
            policy: this.dynamicResource.policy,
          },
        },
      ]
    : this.recordKey
      ? OPERATOR_CATALOG_DEFAULTS[CATALOG_ID].records.filter((r) => r.key === this.recordKey)
      : [
          ...OPERATOR_CATALOG_DEFAULTS[CATALOG_ID].records,
          ...this.catalogService.newServices()
            .filter((resource) => resource.type === 'tour')
            .map((resource) => ({
              key: resource.id,
              active: resource.active,
              typeLabel: 'Actividad principal',
              fields: {
                name: resource.name,
                tariff: formatCurrency(resource.price),
                validity: `${resource.start} - ${resource.end}`,
                policy: resource.policy,
              },
            })),
        ];

  // Mismo mecanismo para cualquier key (base o dinamica): isActive() ya resuelve el
  // override real de Activar/Desactivar sin importar el origen del registro.
  isActive = (key: string, defaultActive: boolean) => this.catalogService.isActive(CATALOG_ID, key, defaultActive);

  // Restriccion base (PDR linea 394/947): el Colaborador operativo consulta catalogos,
  // pero no crea servicios ni modifica tarifas, costos, capacidad ni estado activo/inactivo.
  toggle(key: string, current: boolean): void {
    if (this.roleService.isColaborador()) return;
    this.catalogService.setActive(CATALOG_ID, key, !current);
  }
}
