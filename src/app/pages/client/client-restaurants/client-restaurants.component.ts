import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstablishmentApiService } from '../../../core/establishment-api.service';
import { CURRENT_TENANT_ID } from '../../../core/tenant.constants';

interface RestaurantCard {
  id: string;
  name: string;
  image: string | null;
}

@Component({
  selector: 'app-client-restaurants',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-restaurants.component.html',
  styleUrl: './client-restaurants.component.css',
})
export class ClientRestaurantsComponent implements OnInit {
  private readonly establishmentApi = inject(EstablishmentApiService);

  tenantName = computed(() => '[Tu Marca]');

  private readonly restaurantsSignal = signal<RestaurantCard[]>([]);
  private readonly loadingSignal = signal(true);
  private readonly loadErrorSignal = signal(false);

  loading = this.loadingSignal.asReadonly();
  loadError = this.loadErrorSignal.asReadonly();

  // Restaurantes asociados del tenant actual desde el Backend real
  // (GET /api/tenants/{tenantId}/establishments, kind=RESTAURANT). RN-ASO-001: solo la
  // entidad comercial (nombre/descripcion/imagen), nunca habitaciones, platos ni cupos.
  restaurants = computed<RestaurantCard[]>(() => this.restaurantsSignal());

  ngOnInit(): void {
    this.establishmentApi.listByTenant(CURRENT_TENANT_ID).subscribe({
      next: (items) => {
        this.restaurantsSignal.set(
          items
            .filter((item) => item.kind === 'RESTAURANT' && item.active)
            .map((item) => ({ id: item.establishmentId, name: item.name, image: item.image })),
        );
        this.loadingSignal.set(false);
      },
      error: () => {
        this.loadErrorSignal.set(true);
        this.loadingSignal.set(false);
      },
    });
  }

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
