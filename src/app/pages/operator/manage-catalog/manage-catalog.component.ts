import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../operator-catalog.service';
import { OperatorRoleService } from '../operator-role.service';

const CATALOG_ID = 'catalogo-catalog-panel';

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

  records = this.recordKey
    ? OPERATOR_CATALOG_DEFAULTS[CATALOG_ID].records.filter((r) => r.key === this.recordKey)
    : OPERATOR_CATALOG_DEFAULTS[CATALOG_ID].records;

  isActive = (key: string, defaultActive: boolean) => this.catalogService.isActive(CATALOG_ID, key, defaultActive);

  // Restriccion base (PDR linea 394/947): el Colaborador operativo consulta catalogos,
  // pero no crea servicios ni modifica tarifas, costos, capacidad ni estado activo/inactivo.
  toggle(key: string, current: boolean): void {
    if (this.roleService.isColaborador()) return;
    this.catalogService.setActive(CATALOG_ID, key, !current);
  }
}
