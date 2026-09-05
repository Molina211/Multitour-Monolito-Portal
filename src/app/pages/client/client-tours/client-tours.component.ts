import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClientTourCatalogService } from '../client-tour-catalog.service';

interface TourCard {
  key: string;
  name: string;
  price: number;
  discount: number;
  image: string;
}

@Component({
  selector: 'app-client-tours',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './client-tours.component.html',
  styleUrl: './client-tours.component.css',
})
export class ClientToursComponent {
  private readonly tourCatalogService = inject(ClientTourCatalogService);

  tenantName = computed(() => '[Tu Marca]');

  // Catalogo REAL de Tours (activo + vigente): mismo usado en Detalle del tour y Reservar.
  // Nunca tarjetas hardcodeadas ni caracteristicas turisticas inventadas.
  tours = computed<TourCard[]>(() =>
    Object.values(this.tourCatalogService.getActiveTourServices()).map((tour) => ({
      key: tour.key,
      name: tour.name,
      price: tour.price,
      discount: tour.discount,
      image: tour.image,
    })),
  );

  private readonly searchTermSignal = signal('');
  readonly searchTerm = this.searchTermSignal.asReadonly();
  private readonly diacriticsPattern = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

  private normalize(value: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(this.diacriticsPattern, '');
  }

  filteredTours = computed(() => {
    const query = this.normalize(this.searchTermSignal());
    return this.tours().filter((item) => !query || this.normalize(item.name).includes(query));
  });

  showSearchEmpty = computed(
    () => this.searchTermSignal().trim().length > 0 && this.tours().length > 0 && this.filteredTours().length === 0,
  );

  finalPrice(tour: TourCard): number {
    return tour.price * (1 - tour.discount);
  }

  onSearchInput(event: Event): void {
    this.searchTermSignal.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTermSignal.set('');
  }
}
