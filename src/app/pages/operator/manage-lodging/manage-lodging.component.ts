import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogRecordDefault, OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../operator-catalog.service';
import { OperatorRoleService } from '../operator-role.service';

const CATALOG_ID = 'hospedaje-catalog-panel';

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

@Component({
  selector: 'app-operator-manage-lodging',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './manage-lodging.component.html',
  styleUrl: './manage-lodging.component.css',
})
export class ManageLodgingComponent {
  private readonly catalogService = inject(OperatorCatalogService);
  private readonly route = inject(ActivatedRoute);
  readonly roleService = inject(OperatorRoleService);

  // "Ver detalle" del Colaborador operativo reutiliza esta MISMA ruta/componente cuando el
  // servicio fue creado posteriormente por el Administrador (Nuevo servicio), sin pantalla
  // nueva. Sin "record" en la URL se mantiene el hospedaje base ya aprobado.
  private readonly recordKey = this.route.snapshot.queryParamMap.get('record') || '';
  private readonly dynamicResource = this.recordKey
    ? this.catalogService.newServices().find((resource) => resource.id === this.recordKey && resource.type === 'lodging')
    : undefined;

  private dynamicResourceFields(resource: NonNullable<typeof this.dynamicResource>): CatalogRecordDefault {
    return {
      key: resource.id,
      active: resource.active,
      fields: {
        name: resource.name,
        capacity: resource.capacity != null ? String(resource.capacity) : '',
        tariff: formatCurrency(resource.price),
        validity: `${resource.start} - ${resource.end}`,
        policy: resource.policy,
      },
    };
  }

  // BUG corregido: sin "record" en la URL solo se mostraba el hospedaje base
  // hardcodeado, ignorando hospedajes creados despues en Nuevo servicio. Ahora sale de la
  // MISMA fuente que el contador de "Catálogos" (OperatorCatalogService.activeCount).
  records: CatalogRecordDefault[] = this.dynamicResource
    ? [this.dynamicResourceFields(this.dynamicResource)]
    : this.recordKey
      ? []
      : [
          OPERATOR_CATALOG_DEFAULTS[CATALOG_ID].records[0],
          ...this.catalogService.newServices()
            .filter((resource) => resource.type === 'lodging')
            .map((resource) => this.dynamicResourceFields(resource)),
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
