import { Injectable, inject } from '@angular/core';
import { OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService, TransportCatalogOption } from '../operator/operator-catalog.service';

export interface ClientTourOption {
  key: string;
  name: string;
  price: number;
  discount: number;
  risk: boolean;
  capacity: number | null;
  restrictions: string;
  start: string;
  end: string;
  payments: string[];
  conditions: string[];
  associatedTransport: TransportCatalogOption | null;
  image: string;
}

const TOUR_CATALOG_ID = 'catalogo-catalog-panel';

// El catalogo de Catálogos (OPERATOR_CATALOG_DEFAULTS) todavia no modela medios de pago
// aceptados ni condiciones por servicio. Este enriquecimiento reutiliza EXACTAMENTE los
// mismos datos ya aprobados para estos 4 tours en create-reservation.component.ts
// (KNOWN_TOUR_DETAILS), sin inventar una politica distinta entre esa pantalla y esta. No
// declara "inclusions" de alimentacion: ese texto no corresponde a una relacion real
// verificable por tour en el catalogo actual (PDR v1.7.1: no inventar servicios relacionados
// sin soporte real).
const KNOWN_TOUR_DETAILS: Record<string, Pick<ClientTourOption, 'discount' | 'risk' | 'payments' | 'conditions'>> = {
  'Tour destino ejemplo - Montañas': {
    discount: 0.2,
    risk: false,
    payments: ['Transferencia', 'Efectivo', 'Abono'],
    conditions: [
      'La modificación o cancelación depende de las condiciones vigentes del tour.',
      'La disponibilidad y los valores se validan antes de registrar la reserva.',
    ],
  },
  'Aventura en cenotes ocultos': {
    discount: 0,
    risk: false,
    payments: ['Transferencia', 'Efectivo', 'Abono'],
    conditions: [
      'La modificación o cancelación depende de las condiciones vigentes del tour.',
      'La disponibilidad y los valores se validan antes de registrar la reserva.',
    ],
  },
  'Rafting y acampada extrema': {
    discount: 0,
    risk: true,
    payments: ['Transferencia', 'Abono'],
    conditions: [
      'La actividad requiere requisitos de riesgo para cada viajero.',
      'La modificación o cancelación depende de las condiciones vigentes del servicio.',
    ],
  },
  'Recorrido cultural e histórico': {
    discount: 0,
    risk: false,
    payments: ['Transferencia', 'Efectivo'],
    conditions: [
      'La modificación o cancelación depende de las condiciones vigentes del servicio.',
      'Los descuentos se aplican según la configuración comercial vigente.',
    ],
  },
};
export const GENERIC_TOUR_CONDITION = 'La disponibilidad y los valores se validan antes de registrar la reserva.';
export const DEFAULT_TOUR_PAYMENT_METHODS = ['Transferencia', 'Efectivo', 'Abono'];

const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function parseCatalogDate(text: string | undefined): string {
  const match = /^(\d{1,2})\s+([a-z]{3})\s+(\d{4})$/i.exec((text || '').trim());
  if (!match) return '';
  const monthIndex = MONTH_ABBR.indexOf(match[2].toLowerCase());
  if (monthIndex === -1) return '';
  return `${match[3]}-${String(monthIndex + 1).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}
export function formatOperatorDate(iso: string | undefined): string {
  const [year, month, day] = (iso || '').split('-');
  const monthName = MONTH_ABBR[Number(month) - 1];
  if (!year || !day || !monthName) return iso || '';
  return `${day} ${monthName} ${year}`;
}
function parseCOP(value: string | undefined): number {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

// Datos bancarios para instrucciones de transferencia: no existe hoy una pantalla de
// configuracion de datos bancarios por operador, asi que se centraliza AQUI (una sola
// fuente para toda la pantalla de transferencia) en vez de dejarlos repetidos como texto
// fijo en cada componente. Mismo valor de referencia ya usado en Landing (app.js:
// TENANT_BANK_ACCOUNT), ahora como dato configurable en un solo lugar.
export const TENANT_BANK_ACCOUNT = {
  bank: 'Banco de Occidente',
  accountType: 'Corriente',
  accountNumber: '1234-5678-9012-3456',
  holder: 'Multitour Operaciones S.A.S.',
  taxId: '900.123.456-7',
};

// PDR v1.7.1 (flujo de reserva del Cliente): catalogo REAL de Tours (activo + vigente). El
// PDR no modela una lista independiente de "salidas": la disponibilidad de fecha depende
// exclusivamente de la vigencia (start/end) ya parametrizada del servicio, nunca de fechas
// programadas aparte.
@Injectable({ providedIn: 'root' })
export class ClientTourCatalogService {
  private readonly catalogService = inject(OperatorCatalogService);

  getActiveTourServices(): Record<string, ClientTourOption> {
    const result: Record<string, ClientTourOption> = {};

    for (const record of OPERATOR_CATALOG_DEFAULTS[TOUR_CATALOG_ID].records) {
      if (!this.catalogService.isActive(TOUR_CATALOG_ID, record.key, record.active)) continue;
      const [startText, endText] = (record.fields['validity'] || '').split(' - ');
      const start = parseCatalogDate(startText);
      if (!start) continue;
      const details = KNOWN_TOUR_DETAILS[record.key];
      result[record.key] = {
        key: record.key,
        name: record.fields['name'] || record.key,
        price: parseCOP(record.fields['tariff']),
        discount: details?.discount ?? 0,
        risk: details?.risk ?? false,
        capacity: null,
        restrictions: '',
        start,
        end: parseCatalogDate(endText) || start,
        payments: details?.payments ?? DEFAULT_TOUR_PAYMENT_METHODS,
        conditions: details?.conditions ?? [GENERIC_TOUR_CONDITION],
        associatedTransport: this.catalogService.getTourTransport(record.key),
        image: '',
      };
    }

    for (const resource of this.catalogService.newServices()) {
      if (resource.type !== 'tour' || !resource.active) continue;
      result[resource.id] = {
        key: resource.id,
        name: resource.name,
        price: resource.price,
        discount: 0,
        risk: false,
        capacity: resource.capacity,
        restrictions: resource.restrictions || '',
        start: resource.start,
        end: resource.end,
        payments: DEFAULT_TOUR_PAYMENT_METHODS,
        conditions: [resource.policy || GENERIC_TOUR_CONDITION],
        associatedTransport: this.catalogService.getTourTransport(resource.id),
        image: resource.image || '',
      };
    }

    return result;
  }

  getActiveTourService(key: string): ClientTourOption | null {
    return this.getActiveTourServices()[key] || null;
  }
}
