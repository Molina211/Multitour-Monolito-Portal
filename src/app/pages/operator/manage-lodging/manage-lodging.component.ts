import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../operator-catalog.service';
import { OperatorRoleService } from '../operator-role.service';

const CATALOG_ID = 'hospedaje-catalog-panel';

@Component({
  selector: 'app-operator-manage-lodging',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './manage-lodging.component.html',
  styleUrl: './manage-lodging.component.css',
})
export class ManageLodgingComponent {
  private readonly catalogService = inject(OperatorCatalogService);
  readonly roleService = inject(OperatorRoleService);

  record = OPERATOR_CATALOG_DEFAULTS[CATALOG_ID].records[0];

  isActive = (key: string, defaultActive: boolean) => this.catalogService.isActive(CATALOG_ID, key, defaultActive);

  // Restriccion base (PDR linea 394/947): el Colaborador operativo consulta catalogos,
  // pero no crea servicios ni modifica tarifas, costos, capacidad ni estado activo/inactivo.
  toggle(key: string, current: boolean): void {
    if (this.roleService.isColaborador()) return;
    this.catalogService.setActive(CATALOG_ID, key, !current);
  }
}
