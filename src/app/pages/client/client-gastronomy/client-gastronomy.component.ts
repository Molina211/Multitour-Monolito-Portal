import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AssociatedEstablishment, OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../../operator/operator-catalog.service';

const FOOD_CATALOG_ID = 'alimentacion-catalog-panel';
// Mismo catalogId ya usado en Landing (app.js: OPERATOR_ASSOCIATED_ESTABLISHMENTS_CATALOG_ID)
// para el mapa generico de activo/inactivo (isActive), sin crear un mecanismo paralelo.
const ASSOCIATED_ESTABLISHMENTS_CATALOG_ID = 'associated-establishments';
// BUG corregido: el resto del Portal usa una fecha demo FIJA ('2026-09-01') como "hoy" para
// datos de ejemplo ya vigentes en ese rango. Pero un servicio de Alimentación creado HOY por
// el Administrador (Nuevo servicio) usa la fecha REAL del formulario, así que compararla
// contra una fecha demo congelada lo descartaba como "aún no vigente" apenas su vigencia
// empezaba después del 2026-09-01. Se resuelve la fecha real, mismo mecanismo (Intl +
// America/Bogota) ya usado y aprobado en operator-cash.service.ts (getTenantDateKey): no se
// inventa una política de fechas nueva, solo se deja de usar una fecha demo congelada aquí.
const TENANT_TIMEZONE = 'America/Bogota';
function getTenantToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TENANT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
const TODAY = getTenantToday();
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function parseCatalogDate(text: string | undefined): string {
  const match = /^(\d{1,2})\s+([a-z]{3})\s+(\d{4})$/i.exec((text || '').trim());
  if (!match) return '';
  const monthIndex = MONTH_ABBR.indexOf(match[2].toLowerCase());
  if (monthIndex === -1) return '';
  return `${match[3]}-${String(monthIndex + 1).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function formatOperatorDate(iso: string | undefined): string {
  const [year, month, day] = (iso || '').split('-');
  const monthName = MONTH_ABBR[Number(month) - 1];
  if (!year || !day || !monthName) return iso || '';
  return `${day} ${monthName} ${year}`;
}

interface FoodCard {
  key: string;
  name: string;
  restaurant: string;
  tariff: string;
  validity: string;
  image: string;
}

// Tarjeta unificada para el filtro "Todos": Alimentación y Restaurantes asociados son
// conceptos distintos (PDR v1.7.1), pero deben poder mostrarse LADO A LADO en la misma
// grilla. "type" conserva la clasificación real; nunca se fusionan los datos de ambos.
interface GastronomyCard {
  type: 'food' | 'restaurant';
  key: string;
  name: string;
  image: string;
  restaurantId?: string;
  restaurant?: string;
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
export class ClientGastronomyComponent {
  private readonly catalogService = inject(OperatorCatalogService);
  private readonly route = inject(ActivatedRoute);

  tenantName = computed(() => '[Tu Marca]');

  // "Platos del día" (?filter=food) vs "Todos" (sin query param): mismo mecanismo de
  // ActivatedRoute.queryParamMap ya usado en client-gastronomy-detail.component.ts, pero como
  // signal reactivo (toSignal) porque Angular reutiliza esta MISMA instancia de componente al
  // navegar entre "Todos" y "Platos del día" (misma ruta, solo cambia el query param).
  private readonly queryParamMap = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  activeFilter = computed<'all' | 'food'>(() => (this.queryParamMap().get('filter') === 'food' ? 'food' : 'all'));

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

  // Platos del día / Alimentación: MISMO filtro activo+vigente ya aprobado en
  // client-dashboard.component.ts (destinations) para "Experiencias destacadas", aplicado
  // aquí al catálogo de Alimentación. Nunca un ranking ni una fuente distinta inventada.
  foodOptions = computed<FoodCard[]>(() => {
    const cards: FoodCard[] = [];
    for (const record of OPERATOR_CATALOG_DEFAULTS[FOOD_CATALOG_ID].records) {
      if (!this.catalogService.isActive(FOOD_CATALOG_ID, record.key, record.active)) continue;
      const fields = record.fields;
      const [startText, endText] = (fields['validity'] || '').split(' - ');
      const start = parseCatalogDate(startText);
      const end = parseCatalogDate(endText) || start;
      if (!start || TODAY < start || TODAY > end) continue;
      const restaurant = fields['restaurant'] && fields['restaurant'] !== 'Por configurar' ? fields['restaurant'] : '';
      // Los registros base del catálogo (demo) nunca tuvieron un campo de imagen propia;
      // se mantiene "" para que la tarjeta use el fallback visual existente (sin inventar una).
      cards.push({
        key: record.key,
        name: fields['dish'] || record.key,
        restaurant,
        tariff: fields['tariff'] || 'Por configurar',
        validity: fields['validity'] || '',
        image: '',
      });
    }
    for (const resource of this.catalogService.newServices()) {
      if (resource.type !== 'food') continue;
      if (!this.catalogService.isActive(FOOD_CATALOG_ID, resource.id, resource.active)) continue;
      if (TODAY < resource.start || TODAY > resource.end) continue;
      // BUG corregido: "Nuevo servicio" ya persiste la imagen subida por el Administrador en
      // resource.image (mismo campo que usa new-service.component.ts al guardar); esta tarjeta
      // nunca la leía y siempre mostraba el fallback genérico. Se reutiliza ESE MISMO campo,
      // sin crear uno nuevo.
      cards.push({
        key: resource.id,
        name: resource.name,
        restaurant: '',
        tariff: `$${Math.round(resource.price).toLocaleString('es-CO')}`,
        validity: `${formatOperatorDate(resource.start)} - ${formatOperatorDate(resource.end)}`,
        image: resource.image || '',
      });
    }
    return cards;
  });

  // Lista unificada para la grilla: en "Todos" combina Alimentación + Restaurantes asociados
  // (lado a lado, en la MISMA grilla); en "Platos del día" solo Alimentación. La clasificación
  // real de cada registro (PDR v1.7.1: son conceptos distintos) se conserva en "type", nunca
  // se reclasifica un registro solo para resolver el layout.
  items = computed<GastronomyCard[]>(() => {
    const food: GastronomyCard[] = this.foodOptions().map((option) => ({
      type: 'food',
      key: `food-${option.key}`,
      name: option.name,
      image: option.image,
      restaurant: option.restaurant,
      tariff: option.tariff,
      validity: option.validity,
    }));
    if (this.activeFilter() === 'food') return food;
    const restaurants: GastronomyCard[] = this.restaurants().map((restaurant) => ({
      type: 'restaurant',
      key: `restaurant-${restaurant.id}`,
      name: restaurant.name,
      image: restaurant.image,
      restaurantId: restaurant.id,
    }));
    return [...food, ...restaurants];
  });

  // Buscador ("Buscar restaurantes o platos..."): mismo comportamiento ya aprobado en
  // Landing (setupCatalogSearch) — filtra por nombre sobre los datos reales ya visibles,
  // nunca sobre un arreglo hardcodeado aparte.
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
