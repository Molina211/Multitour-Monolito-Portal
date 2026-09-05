import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssociatedEstablishment, OperatorCatalogService } from '../../operator/operator-catalog.service';

// Mismo catalogId ya usado en Landing (app.js: OPERATOR_ASSOCIATED_ESTABLISHMENTS_CATALOG_ID)
// para el mapa generico de activo/inactivo (isActive), sin crear un mecanismo paralelo.
const ASSOCIATED_ESTABLISHMENTS_CATALOG_ID = 'associated-establishments';

@Component({
  selector: 'app-client-restaurants',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-restaurants.component.html',
  styleUrl: './client-restaurants.component.css',
})
export class ClientRestaurantsComponent {
  private readonly catalogService = inject(OperatorCatalogService);

  tenantName = computed(() => '[Tu Marca]');

  // Restaurantes asociados del tenant actual: misma fuente real (establishments) ya usada
  // por el formulario "Nuevo servicio" del Administrador. Nunca datos globales hardcodeados.
  restaurants = computed<AssociatedEstablishment[]>(() =>
    this.catalogService
      .establishments()
      .filter(
        (item) =>
          item.kind === 'restaurant' &&
          this.catalogService.isActive(ASSOCIATED_ESTABLISHMENTS_CATALOG_ID, item.id, true),
      ),
  );

  // Buscador ("Buscar restaurantes..."): mismo comportamiento ya aprobado en Landing
  // (setupCatalogSearch) — filtra por nombre sobre los restaurantes reales ya visibles.
  private readonly searchTermSignal = signal('');
  readonly searchTerm = this.searchTermSignal.asReadonly();
  private readonly diacriticsPattern = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

  private normalize(value: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(this.diacriticsPattern, '');
  }

  filteredRestaurants = computed(() => {
    const query = this.normalize(this.searchTermSignal());
    return this.restaurants().filter((item) => !query || this.normalize(item.name).includes(query));
  });

  showSearchEmpty = computed(
    () => this.searchTermSignal().trim().length > 0 && this.restaurants().length > 0 && this.filteredRestaurants().length === 0,
  );

  onSearchInput(event: Event): void {
    this.searchTermSignal.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTermSignal.set('');
  }
}
