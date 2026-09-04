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
  // Trayecto (RN-TRA-001: "el transporte... se maneja por trayectos"). Solo aplica a
  // type === 'transport'; estructura minima (origen/destino o descripcion), sin inventar
  // una ruta si el Administrador no la parametrizo.
  route?: string;
  // Costo base interno del transporte (nunca se usa para calcular lo que paga el cliente:
  // ver TransportCatalogOption.price, que es la tarifa comercial). Solo aplica a
  // type === 'transport'.
  cost?: number;
}

export interface AssociatedEstablishment {
  id: string;
  kind: string;
  name: string;
  description: string;
  image: string;
}

// Datos reales de un recurso de Transporte (RN-TRA-001/002), resueltos desde el MISMO
// catalogo ya usado en Gestionar transporte (default + dinamicos activos): nunca inventados.
export interface TransportCatalogOption {
  key: string;
  name: string;
  route: string;
  price: number;
  capacity: number | null;
  // Costo base interno (0 = "Por configurar"). Nunca debe usarse para calcular lo que
  // paga el cliente; es informativo/operativo, distinto de "price" (tarifa comercial).
  cost: number;
}

// Vinculo Tour -> Transporte (Nuevo servicio, "Incluye transporte"). RN-TRA-002: la tarifa
// de transporte puede variar segun el Tour, por lo que "tariffOverride" es especifica de
// ESTE tour y nunca sobrescribe la tarifa generica del recurso de Transporte (que sigue
// aplicando a cualquier otro tour que use el mismo transporte sin su propia tarifa).
export interface TourTransportLink {
  transportKey: string;
  tariffOverride?: number;
}

const SERVICE_STATUS_KEY = 'multitour-service-status';
const NEW_SERVICE_CATALOG_KEY = 'multitour-operator-catalog';
const ASSOCIATED_ESTABLISHMENTS_KEY = 'multitour-associated-establishments';
const TRANSPORT_CATALOG_ID = 'transporte-catalog-panel';
// Relacion Tour -> Transporte (RN-TRA-001/002: "cada tour puede tener una tarifa fija
// propia por persona para el trayecto correspondiente"). Clave = key del tour (catalogo
// base) o id del recurso dinamico; valor = key/id del recurso de Transporte asociado.
const TOUR_TRANSPORT_LINKS_KEY = 'multitour-tour-transport-links';
// Mismo mecanismo y MISMA clave ya usados en la landing aprobada (app.js:
// OPERATOR_SERVICE_FIELDS_KEY / getOperatorServiceFields / setOperatorServiceFields):
// permite al Administrador editar los campos de un registro base del catalogo (ej. el
// recurso demo de Transporte) sin reemplazar OPERATOR_CATALOG_DEFAULTS.
const SERVICE_FIELD_OVERRIDES_KEY = 'multitour-service-fields';

function parseCOP(value: string | undefined): number {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

// Mismos registros demo y catalogos ya confirmados en la landing aprobada (app.js: OPERATOR_CATALOG_DEFAULTS).
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
  // Transporte (PDR 1.7.1, Seccion 11 "Alcance" y RN-TRA-001/002): mismo recurso demo ya
  // aprobado en la landing (app.js: transporte-catalog-panel / admin-gestionar-transporte.html).
  'transporte-catalog-panel': {
    cardIndex: 3,
    backHref: '/operator/catalog/transport',
    records: [
      // AJUSTE: sin capacidad demo hardcodeada ("14"). La capacidad es exclusivamente
      // parametrizable por el Administrador (Configurar transporte); "Por configurar"
      // hasta que la defina, igual que tarifa/costo/vigencia.
      { key: 'Transporte programado', active: true, fields: { name: 'Transporte programado', route: 'Por configurar', capacity: 'Por configurar', tariff: 'Por configurar', cost: 'Por configurar', policy: 'Sin apartamiento previo', validity: 'Por configurar' } },
    ],
  },
};

// Mismo catalogId ya usado por OPERATOR_CATALOG_DEFAULTS: permite que un servicio creado
// posteriormente por el Administrador (Nuevo servicio) cuente como activo real de su
// categoria, sin duplicar catalogos por tipo.
export const NEW_SERVICE_CATALOG_ID_BY_TYPE: Record<string, string> = {
  tour: 'catalogo-catalog-panel',
  lodging: 'hospedaje-catalog-panel',
  food: 'alimentacion-catalog-panel',
  transport: 'transporte-catalog-panel',
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
  private readonly tourTransportLinksSignal = signal<Record<string, TourTransportLink>>(readStorage(TOUR_TRANSPORT_LINKS_KEY, {}));
  private readonly fieldOverridesSignal = signal<Record<string, Record<string, Record<string, string>>>>(
    readStorage(SERVICE_FIELD_OVERRIDES_KEY, {}),
  );

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

  // Regla: el contador nunca puede excluir servicios activos reales creados posteriormente
  // por el Administrador (Nuevo servicio); se suman los del mismo tipo/catalogo.
  activeCount(catalogId: string): number {
    const entry = OPERATOR_CATALOG_DEFAULTS[catalogId];
    const baseActiveCount = entry ? entry.records.filter((record) => this.isActive(catalogId, record.key, record.active)).length : 0;
    // BUG: antes se leia resource.active (el valor de creacion, fijo), en vez de pasar
    // por isActive() (que refleja Activar/Desactivar hecho despues sobre ese MISMO recurso
    // dinamico). Sin esto, desactivar un tour/servicio creado en Nuevo servicio no bajaba
    // este contador ni el de la pantalla "Gestionar <catalogo>" correspondiente.
    const dynamicActiveCount = this.newServicesSignal().filter(
      (resource) => NEW_SERVICE_CATALOG_ID_BY_TYPE[resource.type] === catalogId && this.isActive(catalogId, resource.id, resource.active),
    ).length;
    return baseActiveCount + dynamicActiveCount;
  }

  // Campos editables de un registro BASE del catalogo (ej. "Transporte programado"),
  // con override del Administrador si existe (Configurar transporte), o los valores demo
  // por defecto en caso contrario. Mismo patron que getOperatorServiceFields en la landing.
  getServiceFields(catalogId: string, recordKey: string): Record<string, string> | null {
    return this.fieldOverridesSignal()[catalogId]?.[recordKey] || null;
  }

  setServiceFields(catalogId: string, recordKey: string, fields: Record<string, string>): void {
    const next = { ...this.fieldOverridesSignal() };
    next[catalogId] = { ...(next[catalogId] || {}) };
    next[catalogId][recordKey] = fields;
    this.fieldOverridesSignal.set(next);
    localStorage.setItem(SERVICE_FIELD_OVERRIDES_KEY, JSON.stringify(next));
  }

  // Transportes realmente disponibles para asociar a un Tour (RN-TRA-001/002): solo
  // activos y vigentes, igual que Gestionar transporte. Nunca se hardcodea un transporte
  // nuevo aqui; si no hay tarifa/capacidad parametrizada, se mantiene "Por configurar".
  getActiveTransportOptions(): TransportCatalogOption[] {
    const options: TransportCatalogOption[] = [];
    const defaultRecord = OPERATOR_CATALOG_DEFAULTS[TRANSPORT_CATALOG_ID]?.records[0];
    if (defaultRecord && this.isActive(TRANSPORT_CATALOG_ID, defaultRecord.key, defaultRecord.active)) {
      const fields = this.getServiceFields(TRANSPORT_CATALOG_ID, defaultRecord.key) || defaultRecord.fields;
      options.push({
        key: defaultRecord.key,
        name: fields['name'] || defaultRecord.key,
        route: fields['route']?.trim() || 'Por configurar',
        price: parseCOP(fields['tariff']),
        capacity: parseCOP(fields['capacity']) || null,
        cost: parseCOP(fields['cost']),
      });
    }
    for (const resource of this.newServicesSignal()) {
      if (resource.type !== 'transport' || !resource.active) continue;
      options.push({
        key: resource.id,
        name: resource.name,
        route: resource.route?.trim() || 'Por configurar',
        price: resource.price,
        capacity: resource.capacity,
        cost: resource.cost ?? 0,
      });
    }
    return options;
  }

  getTransportOptionByKey(key: string): TransportCatalogOption | null {
    return this.getActiveTransportOptions().find((option) => option.key === key) || null;
  }

  // Actualiza los campos GLOBALES del recurso de Transporte (trayecto/capacidad/costo
  // base): valen para cualquier Tour que lo use, igual que si se editaran desde
  // Configurar transporte (mismo mecanismo, reutilizado aqui para no duplicar logica). La
  // tarifa por persona NO se toca aqui: es especifica por Tour (ver setTourTransport).
  updateTransportResourceConfig(transportKey: string, patch: { route?: string; capacity?: number | null; cost?: number }): void {
    const defaultRecord = OPERATOR_CATALOG_DEFAULTS[TRANSPORT_CATALOG_ID]?.records[0];
    if (defaultRecord && defaultRecord.key === transportKey) {
      const current = this.getServiceFields(TRANSPORT_CATALOG_ID, transportKey) || defaultRecord.fields;
      const updated: Record<string, string> = { ...current };
      if (patch.route !== undefined) updated['route'] = patch.route.trim() || 'Por configurar';
      if (patch.capacity !== undefined) updated['capacity'] = patch.capacity != null && patch.capacity > 0 ? String(patch.capacity) : 'Por configurar';
      if (patch.cost !== undefined) updated['cost'] = patch.cost > 0 ? `$${Math.round(patch.cost).toLocaleString('es-CO')}` : 'Por configurar';
      this.setServiceFields(TRANSPORT_CATALOG_ID, transportKey, updated);
      return;
    }
    const next = this.newServicesSignal().map((resource) => {
      if (resource.id !== transportKey || resource.type !== 'transport') return resource;
      return {
        ...resource,
        route: patch.route !== undefined ? patch.route.trim() || undefined : resource.route,
        capacity: patch.capacity !== undefined ? patch.capacity : resource.capacity,
        cost: patch.cost !== undefined ? patch.cost : resource.cost,
      };
    });
    this.newServicesSignal.set(next);
    localStorage.setItem(NEW_SERVICE_CATALOG_KEY, JSON.stringify(next));
  }

  // Relacion Tour -> Transporte (Nuevo servicio, "Incluye transporte"). Se guarda por
  // key/id del Tour; si el transporte asociado deja de estar activo, getTourTransport
  // devuelve null (no se inventa ni se conserva un transporte que ya no existe realmente).
  getTourTransportLink(tourKey: string): TourTransportLink | null {
    return this.tourTransportLinksSignal()[tourKey] || null;
  }

  // RN-TRA-002: si esta reserva de Tour tiene una tarifa propia (tariffOverride), se
  // antepone a la tarifa generica del transporte, sin modificarla para otros tours.
  getTourTransport(tourKey: string): TransportCatalogOption | null {
    const link = this.getTourTransportLink(tourKey);
    if (!link) return null;
    const option = this.getTransportOptionByKey(link.transportKey);
    if (!option) return null;
    return link.tariffOverride != null ? { ...option, price: link.tariffOverride } : option;
  }

  setTourTransport(tourKey: string, transportKey: string | null, tariffOverride?: number | null): void {
    const next = { ...this.tourTransportLinksSignal() };
    if (transportKey) {
      next[tourKey] = { transportKey, tariffOverride: tariffOverride != null && tariffOverride > 0 ? tariffOverride : undefined };
    } else {
      delete next[tourKey];
    }
    this.tourTransportLinksSignal.set(next);
    localStorage.setItem(TOUR_TRANSPORT_LINKS_KEY, JSON.stringify(next));
  }
}
