import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssociatedEstablishment, OperatorCatalogService } from '../../operator/operator-catalog.service';

// Mismo catalogId ya usado en Landing (app.js: OPERATOR_ASSOCIATED_ESTABLISHMENTS_CATALOG_ID)
// para el mapa generico de activo/inactivo (isActive), sin crear un mecanismo paralelo.
const ASSOCIATED_ESTABLISHMENTS_CATALOG_ID = 'associated-establishments';

@Component({
  selector: 'app-client-lodging',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-lodging.component.html',
  styleUrl: './client-lodging.component.css',
})
export class ClientLodgingComponent {
  private readonly catalogService = inject(OperatorCatalogService);

  tenantName = computed(() => '[Tu Marca]');

  // Hoteles asociados del tenant actual: misma fuente real (establishments) ya usada por
  // Restaurantes asociados (mismo mecanismo, kind !== 'restaurant'). Nunca se modelan
  // habitaciones ni disponibilidad: solo el establecimiento asociado activo.
  hotels = computed<AssociatedEstablishment[]>(() =>
    this.catalogService
      .establishments()
      .filter(
        (item) =>
          item.kind === 'hotel' &&
          this.catalogService.isActive(ASSOCIATED_ESTABLISHMENTS_CATALOG_ID, item.id, true),
      ),
  );

  // Buscador ("Buscar hoteles..."): mismo comportamiento ya aprobado en Restaurantes
  // asociados — filtra por nombre sobre los hoteles reales ya visibles.
  private readonly searchTermSignal = signal('');
  readonly searchTerm = this.searchTermSignal.asReadonly();
  private readonly diacriticsPattern = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

  private normalize(value: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(this.diacriticsPattern, '');
  }

  filteredHotels = computed(() => {
    const query = this.normalize(this.searchTermSignal());
    return this.hotels().filter((item) => !query || this.normalize(item.name).includes(query));
  });

  showSearchEmpty = computed(
    () => this.searchTermSignal().trim().length > 0 && this.hotels().length > 0 && this.filteredHotels().length === 0,
  );

  onSearchInput(event: Event): void {
    this.searchTermSignal.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTermSignal.set('');
  }
}
