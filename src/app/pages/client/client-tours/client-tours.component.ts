import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogApiService, CatalogItemResponse } from '../../../core/catalog-api.service';
import { CURRENT_TENANT_ID } from '../../../core/tenant.constants';

interface TourCard {
  id: string;
  name: string;
  price: number;
  capacity: number | null;
  image: string | null;
}

// Misma referencia horaria ya usada en el resto del Portal (America/Bogota).
function getTenantToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function isVigente(item: CatalogItemResponse, today: string): boolean {
  if (item.validFrom && item.validFrom > today) return false;
  if (item.validTo && item.validTo < today) return false;
  return true;
}

@Component({
  selector: 'app-client-tours',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './client-tours.component.html',
  styleUrl: './client-tours.component.css',
})
export class ClientToursComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);

  tenantName = computed(() => '[Tu Marca]');

  private readonly toursSignal = signal<TourCard[]>([]);
  private readonly loadingSignal = signal(true);
  private readonly loadErrorSignal = signal(false);

  loading = this.loadingSignal.asReadonly();
  loadError = this.loadErrorSignal.asReadonly();

  // Catalogo REAL de Tours desde el Backend (GET /api/tenants/{tenantId}/catalog-items),
  // filtrado a type=TOUR, activo y vigente (validFrom/validTo). Nunca tarjetas
  // hardcodeadas ni caracteristicas turisticas inventadas.
  tours = computed<TourCard[]>(() => this.toursSignal());

  ngOnInit(): void {
    const today = getTenantToday();
    this.catalogApi.listByTenant(CURRENT_TENANT_ID).subscribe({
      next: (items) => {
        this.toursSignal.set(
          items
            .filter((item) => item.type === 'TOUR' && item.active && isVigente(item, today))
            .map((item) => ({
              id: item.catalogItemId,
              name: item.name,
              price: Number(item.price),
              capacity: item.capacity,
              image: item.image,
            })),
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

  filteredTours = computed(() => {
    const query = this.normalize(this.searchTermSignal());
    return this.tours().filter((item) => !query || this.normalize(item.name).includes(query));
  });

  showSearchEmpty = computed(
    () => this.searchTermSignal().trim().length > 0 && this.tours().length > 0 && this.filteredTours().length === 0,
  );

  onSearchInput(event: Event): void {
    this.searchTermSignal.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTermSignal.set('');
  }
}
