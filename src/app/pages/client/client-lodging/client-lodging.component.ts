import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstablishmentApiService } from '../../../core/establishment-api.service';
import { CURRENT_TENANT_ID } from '../../../core/tenant.constants';

interface HotelCard {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
}

@Component({
  selector: 'app-client-lodging',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-lodging.component.html',
  styleUrl: './client-lodging.component.css',
})
export class ClientLodgingComponent implements OnInit {
  private readonly establishmentApi = inject(EstablishmentApiService);

  tenantName = computed(() => '[Tu Marca]');

  private readonly hotelsSignal = signal<HotelCard[]>([]);
  private readonly loadingSignal = signal(true);
  private readonly loadErrorSignal = signal(false);

  loading = this.loadingSignal.asReadonly();
  loadError = this.loadErrorSignal.asReadonly();

  // Hoteles asociados del tenant actual desde el Backend real
  // (GET /api/tenants/{tenantId}/establishments, kind=HOTEL). RN-ASO-001: nunca se
  // modelan habitaciones ni disponibilidad, solo el establecimiento asociado activo.
  hotels = computed<HotelCard[]>(() => this.hotelsSignal());

  ngOnInit(): void {
    this.establishmentApi.listByTenant(CURRENT_TENANT_ID).subscribe({
      next: (items) => {
        this.hotelsSignal.set(
          items
            .filter((item) => item.kind === 'HOTEL' && item.active)
            .map((item) => ({ id: item.establishmentId, name: item.name, description: item.description, image: item.image })),
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
