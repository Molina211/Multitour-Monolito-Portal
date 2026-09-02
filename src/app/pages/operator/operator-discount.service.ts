import { Injectable, signal } from '@angular/core';
import { OPERATOR_CATALOG_DEFAULTS } from './operator-catalog.service';

export interface OperatorDiscount {
  id: string;
  service: string;
  serviceLabel?: string;
  percentage: number;
  start: string;
  end: string;
  priority: number;
  stackable: string;
  cap: string;
  base: string;
  active: boolean;
}

export interface DiscountServiceOption {
  key: string;
  label: string;
}

const DISCOUNTS_STORAGE_KEY = 'multitour-discounts';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Mismas opciones de servicio/producto ya confirmadas en la landing aprobada
// (app.js: getOperatorCatalogServiceOptions), a partir del mismo catalogo de defaults.
export function getOperatorCatalogServiceOptions(): DiscountServiceOption[] {
  return Object.values(OPERATOR_CATALOG_DEFAULTS).flatMap((entry) =>
    entry.records.map((record) => ({
      key: record.key,
      label: record.fields?.['name'] || record.fields?.['dish'] || record.fields?.['restaurant'] || record.key,
    })),
  );
}

// Simulacion local (localStorage), misma clave "multitour-discounts" ya usada en la landing aprobada.
@Injectable({ providedIn: 'root' })
export class OperatorDiscountService {
  private readonly discountsSignal = signal<OperatorDiscount[]>(readStorage(DISCOUNTS_STORAGE_KEY, []));
  readonly discounts = this.discountsSignal.asReadonly();

  getDiscount(id: string): OperatorDiscount | undefined {
    return this.discountsSignal().find((discount) => discount.id === id);
  }

  addDiscount(discount: OperatorDiscount): void {
    const next = [...this.discountsSignal(), discount];
    this.discountsSignal.set(next);
    localStorage.setItem(DISCOUNTS_STORAGE_KEY, JSON.stringify(next));
  }

  saveDiscount(discount: OperatorDiscount): void {
    const current = this.discountsSignal();
    const index = current.findIndex((item) => item.id === discount.id);
    const next = index === -1 ? [...current, discount] : current.map((item, i) => (i === index ? discount : item));
    this.discountsSignal.set(next);
    localStorage.setItem(DISCOUNTS_STORAGE_KEY, JSON.stringify(next));
  }
}
