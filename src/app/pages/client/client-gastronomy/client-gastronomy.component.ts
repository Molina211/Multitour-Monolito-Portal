import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogApiService } from '../../../core/catalog-api.service';
import { EstablishmentApiService } from '../../../core/establishment-api.service';
import { CURRENT_TENANT_ID } from '../../../core/tenant.constants';

const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function formatOperatorDate(iso: string | undefined | null): string {
  const [year, month, day] = (iso || '').split('-');
  const monthName = MONTH_ABBR[Number(month) - 1];
  if (!year || !day || !monthName) return iso || '';
  return `${day} ${monthName} ${year}`;
}
function getTenantToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// Tarjeta unificada para el filtro "Todos": Alimentación y Restaurantes asociados son
// conceptos distintos (PDR v1.7.1), pero deben poder mostrarse LADO A LADO en la misma
// grilla. "type" conserva la clasificación real; nunca se fusionan los datos de ambos.
interface GastronomyCard {
  type: 'food' | 'restaurant';
  key: string;
  name: string;
  image: string | null;
  tariff?: string;
  validity?: string;
}

@Component({
  selector: 'app-client-gastronomy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-gastronomy.component.html',
  styleUrl: './client-gastronomy.component.css',
})
export class ClientGastronomyComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly route = inject(ActivatedRoute);

  tenantName = computed(() => '[Tu Marca]');

  // "Platos del día" (?filter=food) vs "Todos" (sin query param): signal reactivo (toSignal)
  // porque Angular reutiliza esta MISMA instancia de componente al navegar entre ambos
  // filtros (misma ruta, solo cambia el query param).
  private readonly queryParamMap = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  activeFilter = computed<'all' | 'food'>(() => (this.queryParamMap().get('filter') === 'food' ? 'food' : 'all'));

  private readonly foodSignal = signal<GastronomyCard[]>([]);
  private readonly restaurantsSignal = signal<GastronomyCard[]>([]);
  private readonly loadingSignal = signal(true);
  private readonly loadErrorSignal = signal(false);

  loading = this.loadingSignal.asReadonly();
  loadError = this.loadErrorSignal.asReadonly();

  ngOnInit(): void {
    const today = getTenantToday();
    forkJoin({
      catalog: this.catalogApi.listByTenant(CURRENT_TENANT_ID),
      establishments: this.establishmentApi.listByTenant(CURRENT_TENANT_ID),
    }).subscribe({
      next: ({ catalog, establishments }) => {
        this.foodSignal.set(
          catalog
            .filter((item) => item.type === 'FOOD' && item.active)
            .filter((item) => !(item.validFrom && item.validFrom > today) && !(item.validTo && item.validTo < today))
            .map((item) => ({
              type: 'food',
              key: `food-${item.catalogItemId}`,
              name: item.name,
              image: item.image,
              tariff: `$${Math.round(Number(item.price)).toLocaleString('es-CO')}`,
              validity: item.validFrom || item.validTo ? `${formatOperatorDate(item.validFrom)} - ${formatOperatorDate(item.validTo)}` : '',
            })),
        );
        this.restaurantsSignal.set(
          establishments
            .filter((item) => item.kind === 'RESTAURANT' && item.active)
            .map((item) => ({ type: 'restaurant', key: `restaurant-${item.establishmentId}`, name: item.name, image: item.image })),
        );
        this.loadingSignal.set(false);
      },
      error: () => {
        this.loadErrorSignal.set(true);
        this.loadingSignal.set(false);
      },
    });
  }

  // Lista unificada para la grilla: en "Todos" combina Alimentación + Restaurantes asociados
  // (lado a lado, en la MISMA grilla); en "Platos del día" solo Alimentación. La clasificación
  // real de cada registro (PDR v1.7.1: son conceptos distintos) se conserva en "type".
  items = computed<GastronomyCard[]>(() => {
    const food = this.foodSignal();
    if (this.activeFilter() === 'food') return food;
    return [...food, ...this.restaurantsSignal()];
  });

  // Buscador ("Buscar restaurantes o platos..."): filtra por nombre sobre los datos reales
  // ya visibles, nunca sobre un arreglo hardcodeado aparte.
  private readonly searchTermSignal = signal('');
  readonly searchTerm = this.searchTermSignal.asReadonly();

  private readonly diacriticsPattern = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

  private normalize(value: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(this.diacriticsPattern, '');
  }

  filteredItems = computed(() => {
    const query = this.normalize(this.searchTermSignal());
    return this.items().filter((item) => !query || this.normalize(item.name).includes(query));
  });

  // El estado "sin resultados de búsqueda" solo aplica cuando SÍ hay datos reales (para el
  // filtro activo) pero ninguno coincide con la búsqueda; si no hay datos en absoluto, la
  // grilla ya muestra su propio estado vacío (no depende de la búsqueda).
  hasAnyData = computed(() => this.items().length > 0);
  showSearchEmpty = computed(
    () => this.searchTermSignal().trim().length > 0 && this.hasAnyData() && this.filteredItems().length === 0,
  );

  onSearchInput(event: Event): void {
    this.searchTermSignal.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTermSignal.set('');
  }
}
