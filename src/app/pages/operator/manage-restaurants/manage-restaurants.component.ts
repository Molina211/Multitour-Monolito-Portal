import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssociatedEstablishment, OperatorCatalogService } from '../operator-catalog.service';
import { OperatorRoleService } from '../operator-role.service';

// Mismo catalogId ya usado por Gastronomía Cliente para leer el mismo estado
// activo/inactivo (ver client-gastronomy.component.ts): sin crear un mecanismo paralelo.
const ASSOCIATED_ESTABLISHMENTS_CATALOG_ID = 'associated-establishments';

@Component({
  selector: 'app-operator-manage-restaurants',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './manage-restaurants.component.html',
  styleUrl: './manage-restaurants.component.css',
})
export class ManageRestaurantsComponent {
  private readonly catalogService = inject(OperatorCatalogService);
  readonly roleService = inject(OperatorRoleService);

  // Restaurantes asociados: mismo registro que ya crea "Nuevo servicio" ->
  // "Establecimiento asociado" -> "Restaurante asociado", y que ya consume Gastronomía
  // Cliente. Ninguna fuente nueva: solo se agrega la consulta/activación que faltaba.
  restaurants = computed<AssociatedEstablishment[]>(() =>
    this.catalogService.establishments().filter((item) => item.kind === 'restaurant'),
  );

  isActive = (id: string) => this.catalogService.isActive(ASSOCIATED_ESTABLISHMENTS_CATALOG_ID, id, true);

  // Restricción base (PDR línea 394/947, mismo criterio ya aplicado en manage-food.component):
  // el Colaborador operativo consulta, pero no activa/inactiva.
  toggle(id: string, current: boolean): void {
    if (this.roleService.isColaborador()) return;
    this.catalogService.setActive(ASSOCIATED_ESTABLISHMENTS_CATALOG_ID, id, !current);
  }
}
