import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogRecordDefault, OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../operator-catalog.service';
import { OperatorRoleService } from '../operator-role.service';

const CATALOG_ID = 'transporte-catalog-panel';

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

@Component({
  selector: 'app-operator-manage-transport',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './manage-transport.component.html',
  styleUrl: './manage-transport.component.css',
})
export class ManageTransportComponent {
  private readonly catalogService = inject(OperatorCatalogService);
  private readonly route = inject(ActivatedRoute);
  readonly roleService = inject(OperatorRoleService);

  // "Ver detalle" del Colaborador operativo reutiliza esta MISMA ruta/componente cuando el
  // recurso fue creado posteriormente por el Administrador (Nuevo servicio), sin pantalla
  // nueva. Sin "record" en la URL se mantiene el recurso base ya aprobado (mismo patron ya
  // usado en Gestionar hospedaje / Gestionar alimentación).
  private readonly recordKey = this.route.snapshot.queryParamMap.get('record') || '';
  private readonly dynamicResource = this.recordKey
    ? this.catalogService.newServices().find((resource) => resource.id === this.recordKey && resource.type === 'transport')
    : undefined;

  private dynamicResourceFields(resource: NonNullable<typeof this.dynamicResource>): CatalogRecordDefault {
    return {
      key: resource.id,
      active: resource.active,
      fields: {
        name: resource.name,
        route: resource.route?.trim() || 'Por configurar',
        capacity: resource.capacity != null ? String(resource.capacity) : '',
        tariff: formatCurrency(resource.price),
        cost: resource.cost && resource.cost > 0 ? formatCurrency(resource.cost) : 'Por configurar',
        validity: `${resource.start} - ${resource.end}`,
        policy: resource.policy,
      },
    };
  }

  private defaultRecordFields(): CatalogRecordDefault {
    const base = OPERATOR_CATALOG_DEFAULTS[CATALOG_ID].records[0];
    // Refleja lo realmente parametrizado por el Administrador (Configurar transporte),
    // en vez del valor demo, si ya existe una configuracion guardada.
    const fields = this.catalogService.getServiceFields(CATALOG_ID, base.key) || base.fields;
    return { ...base, fields };
  }

  // BUG corregido: sin "record" en la URL solo se mostraba el transporte base, ignorando
  // transportes creados despues en Nuevo servicio. Ahora sale de la MISMA fuente que el
  // contador de "Catálogos" (OperatorCatalogService.activeCount).
  records: CatalogRecordDefault[] = this.dynamicResource
    ? [this.dynamicResourceFields(this.dynamicResource)]
    : this.recordKey
      ? []
      : [
          this.defaultRecordFields(),
          ...this.catalogService.newServices()
            .filter((resource) => resource.type === 'transport')
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
