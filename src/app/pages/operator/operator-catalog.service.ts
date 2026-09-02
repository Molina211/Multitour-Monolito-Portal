import { Injectable, signal } from '@angular/core';

export interface CatalogRecordDefault {
  key: string;
  active: boolean;
  typeLabel?: string;
  fields: Record<string, string>;
}

export interface CatalogDefaultsEntry {
  cardIndex: number;
  backHref: string;
  records: CatalogRecordDefault[];
}

export interface NewServiceResource {
  id: string;
  name: string;
  type: string;
  price: number;
  capacity: number | null;
  restrictions: string;
  start: string;
  end: string;
  policy: string;
  image: string;
  active: boolean;
}

export interface AssociatedEstablishment {
  id: string;
  kind: string;
  name: string;
  description: string;
  image: string;
}

const SERVICE_STATUS_KEY = 'multitour-service-status';
const NEW_SERVICE_CATALOG_KEY = 'multitour-operator-catalog';
const ASSOCIATED_ESTABLISHMENTS_KEY = 'multitour-associated-establishments';

// Mismos registros demo y catalogos ya confirmados en la landing aprobada (app.js: OPERATOR_CATALOG_DEFAULTS).
// Transporte queda fuera: su pantalla de gestion no forma parte de este bloque.
export const OPERATOR_CATALOG_DEFAULTS: Record<string, CatalogDefaultsEntry> = {
  'catalogo-catalog-panel': {
    cardIndex: 0,
    backHref: '/operator/catalog/tours',
    records: [
      { key: 'Tour destino ejemplo - Montañas', active: true, typeLabel: 'Actividad principal', fields: { name: 'Tour destino ejemplo - Montañas', tariff: '$1.299.000', validity: '01 sep 2026 - 30 sep 2026', policy: 'Confirmación directa solo con pago válido' } },
      { key: 'Aventura en cenotes ocultos', active: true, typeLabel: 'Actividad principal', fields: { name: 'Aventura en cenotes ocultos', tariff: '$520.000', validity: '01 sep 2026 - 30 sep 2026', policy: 'Confirmación directa solo con pago válido' } },
      { key: 'Recorrido cultural e histórico', active: true, typeLabel: 'Actividad principal', fields: { name: 'Recorrido cultural e histórico', tariff: '$349.000', validity: '01 sep 2026 - 30 sep 2026', policy: 'Confirmación directa solo con pago válido' } },
      { key: 'Rafting y acampada extrema', active: true, typeLabel: 'Actividad principal', fields: { name: 'Rafting y acampada extrema', tariff: '$799.000', validity: '01 sep 2026 - 30 sep 2026', policy: 'Confirmación directa solo con pago válido' } },
    ],
  },
  'hospedaje-catalog-panel': {
    cardIndex: 1,
    backHref: '/operator/catalog/lodging',
    records: [
      { key: 'Ecohotel Mirador', active: true, fields: { name: 'Ecohotel Mirador', capacity: '2', tariff: '$580.000', validity: '01 sep 2026 - 30 sep 2026', policy: 'Apartamiento temporal' } },
    ],
  },
  'alimentacion-catalog-panel': {
    cardIndex: 2,
    backHref: '/operator/catalog/food',
    records: [
      { key: 'Por configurar', active: false, fields: { restaurant: 'Por configurar', dish: 'Plato del día', tariff: 'Por configurar', validity: '01 sep 2026 - 30 sep 2026', policy: 'Sin apartamiento previo' } },
    ],
  },
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Simulacion local (localStorage), mismas claves ya usadas en la landing aprobada.
@Injectable({ providedIn: 'root' })
export class OperatorCatalogService {
  private readonly statusSignal = signal<Record<string, Record<string, 'active' | 'inactive'>>>(readStorage(SERVICE_STATUS_KEY, {}));
  private readonly newServicesSignal = signal<NewServiceResource[]>(readStorage(NEW_SERVICE_CATALOG_KEY, []));
  private readonly establishmentsSignal = signal<AssociatedEstablishment[]>(readStorage(ASSOCIATED_ESTABLISHMENTS_KEY, []));

  readonly newServices = this.newServicesSignal.asReadonly();
  readonly establishments = this.establishmentsSignal.asReadonly();

  isActive(catalogId: string, key: string, defaultActive: boolean): boolean {
    const stored = this.statusSignal()[catalogId]?.[key];
    return stored ? stored === 'active' : defaultActive;
  }

  setActive(catalogId: string, key: string, active: boolean): void {
    const next = { ...this.statusSignal() };
    next[catalogId] = { ...(next[catalogId] || {}), [key]: active ? 'active' : 'inactive' };
    this.statusSignal.set(next);
    localStorage.setItem(SERVICE_STATUS_KEY, JSON.stringify(next));
  }

  addNewService(resource: NewServiceResource): void {
    const next = [...this.newServicesSignal(), resource];
    this.newServicesSignal.set(next);
    localStorage.setItem(NEW_SERVICE_CATALOG_KEY, JSON.stringify(next));
  }

  addAssociatedEstablishment(establishment: AssociatedEstablishment): void {
    const next = [...this.establishmentsSignal(), establishment];
    this.establishmentsSignal.set(next);
    localStorage.setItem(ASSOCIATED_ESTABLISHMENTS_KEY, JSON.stringify(next));
  }

  activeCount(catalogId: string): number {
    const entry = OPERATOR_CATALOG_DEFAULTS[catalogId];
    if (!entry) return 0;
    return entry.records.filter((record) => this.isActive(catalogId, record.key, record.active)).length;
  }
}
