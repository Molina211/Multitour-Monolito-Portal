import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../operator-catalog.service';

const CATALOG_ID = 'alimentacion-catalog-panel';

@Component({
  selector: 'app-operator-manage-food',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './manage-food.component.html',
  styleUrl: './manage-food.component.css',
})
export class ManageFoodComponent {
  private readonly catalogService = inject(OperatorCatalogService);

  record = OPERATOR_CATALOG_DEFAULTS[CATALOG_ID].records[0];

  isActive = (key: string, defaultActive: boolean) => this.catalogService.isActive(CATALOG_ID, key, defaultActive);

  toggle(key: string, current: boolean): void {
    this.catalogService.setActive(CATALOG_ID, key, !current);
  }
}
