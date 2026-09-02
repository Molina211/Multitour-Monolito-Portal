import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../operator-catalog.service';

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

  records = OPERATOR_CATALOG_DEFAULTS[CATALOG_ID].records;

  isActive = (key: string, defaultActive: boolean) => this.catalogService.isActive(CATALOG_ID, key, defaultActive);

  toggle(key: string, current: boolean): void {
    this.catalogService.setActive(CATALOG_ID, key, !current);
  }
}
