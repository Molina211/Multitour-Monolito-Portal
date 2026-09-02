import { Injectable, signal } from '@angular/core';

export interface OperatorReservation {
  code: string;
  customer: string;
  email: string;
  service: string;
  date: string;
  travelers: number;
  companions: string;
  status: string;
  statusClass: string;
  projected: string;
  discount: string;
  final: string;
  paid: string;
  balance: string;
  payment: string;
  method: string;
  execution: string;
  action: string;
  href: string;
  pendingTransferAmount?: number;
  supportPending?: boolean;
  hasAdditionalDiscount?: boolean;
}

export interface ReservationAdjustment {
  percentage: number;
  reason: string;
  appliedAt: string;
}

export interface PendingSupportRecord {
  code: string;
  customer: string;
  method: string;
  amount: string;
  status: string;
}

const DRAFT_STORAGE_KEY = 'operatorReservationDraft';
// Misma clave ya usada en la landing aprobada (app.js: OPERATOR_RESERVATION_ADJUSTMENTS_KEY).
const ADJUSTMENTS_STORAGE_KEY = 'multitour-reservation-adjustments';

function parseCOP(value: string | undefined): number {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

function formatCOP(value: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(value))}`;
}

// Mismos 6 registros demo ya confirmados en la landing aprobada (app.js: OPERATOR_RESERVATIONS).
export const OPERATOR_RESERVATIONS: Record<string, OperatorReservation> = {
  'RES-1842': { code: 'RES-1842', customer: 'Laura Gómez', email: 'laura.gomez@ejemplo.com', service: 'Tour Montañas', date: '15 sep 2026', travelers: 2, companions: '1 registrado', status: 'Pendiente de pago', statusClass: 'is-pending', projected: '$1.299.000', discount: '-$259.800', final: '$1.039.200', paid: '$0', balance: '$1.039.200', payment: 'Sin pago', method: 'Transferencia', execution: 'Pendiente de ejecución', action: 'Gestionar pago', href: 'admin-pagos.html' },
  'RES-1841': { code: 'RES-1841', customer: 'Mateo Ríos', email: 'mateo.rios@ejemplo.com', service: 'Rafting y acampada', date: '13 sep 2026', travelers: 2, companions: '1 registrado', status: 'Confirmada', statusClass: 'is-confirmed', projected: '$1.600.000', discount: '$0', final: '$1.600.000', paid: '$1.600.000', balance: '$0', payment: 'Pagado', method: 'Transferencia', execution: 'Pendiente de ejecución', action: 'Ver operación', href: 'admin-operacion.html' },
  'RES-1840': { code: 'RES-1840', customer: 'Carolina Díaz', email: 'carolina.diaz@ejemplo.com', service: 'Ruta arqueológica', date: '1 sep 2026', travelers: 4, companions: '3 registrados', status: 'En ejecución', statusClass: 'is-execution', projected: '$2.400.000', discount: '$0', final: '$2.400.000', paid: '$2.400.000', balance: '$0', payment: 'Pagado', method: 'Efectivo', execution: 'En ejecución', action: 'Ver operación', href: 'admin-operacion.html' },
  'RES-1837': { code: 'RES-1837', customer: 'Juliana Cruz', email: 'juliana.cruz@ejemplo.com', service: 'Tour Montañas', date: '22 sep 2026', travelers: 3, companions: '2 registrados', status: 'Pendiente de pago', statusClass: 'is-pending', projected: '$3.897.000', discount: '-$779.400', final: '$3.117.600', paid: '$1.039.200', balance: '$2.078.400', payment: 'Parcial', method: 'Abono', execution: 'Pendiente de ejecución', action: 'Gestionar pago', href: 'admin-pagos.html' },
  'RES-1829': { code: 'RES-1829', customer: 'Andrés Silva', email: 'andres.silva@ejemplo.com', service: 'Tour Montañas', date: '29 ago 2026', travelers: 2, companions: '1 registrado', status: 'Finalizada', statusClass: 'is-finalized', projected: '$2.598.000', discount: '-$519.600', final: '$2.078.400', paid: '$2.078.400', balance: '$0', payment: 'Pagado', method: 'Transferencia', execution: 'Finalizada', action: 'Ver operación', href: 'admin-operacion.html' },
  'RES-1822': { code: 'RES-1822', customer: 'Paula Méndez', email: 'paula.mendez@ejemplo.com', service: 'Rafting y acampada', date: '27 ago 2026', travelers: 2, companions: '1 registrado', status: 'Cancelada', statusClass: 'is-cancelled', projected: '$1.600.000', discount: '$0', final: '$1.600.000', paid: '$0', balance: '$0', payment: 'Sin pago', method: 'Transferencia', execution: 'No ejecutada', action: 'Ver pago', href: 'admin-pagos.html' },
};

// Mismos registros demo de soportes pendientes ya confirmados en la landing aprobada (admin-pagos.html).
const PENDING_SUPPORT_RECORDS: PendingSupportRecord[] = [
  { code: 'RES-1842', customer: 'Laura Gómez', method: 'Transferencia', amount: '$1.039.200', status: 'En validación' },
  { code: 'RES-1837', customer: 'Juliana Cruz', method: 'Abono', amount: '$800.000', status: 'Saldo pendiente' },
];

function readDraft(): OperatorReservation | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OperatorReservation) : null;
  } catch {
    return null;
  }
}

function readAdjustments(): Record<string, ReservationAdjustment> {
  try {
    return JSON.parse(localStorage.getItem(ADJUSTMENTS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

// Simulacion local (sessionStorage para el draft de reserva, localStorage para descuentos
// adicionales), mismas claves ya usadas en la landing aprobada.
@Injectable({ providedIn: 'root' })
export class OperatorReservationService {
  private readonly draftSignal = signal<OperatorReservation | null>(readDraft());
  readonly draft = this.draftSignal.asReadonly();

  readonly reservationCodesInOrder = ['RES-1842', 'RES-1841', 'RES-1840', 'RES-1837', 'RES-1829', 'RES-1822'];

  // El contador de "pendientes" de la pantalla Pagos debe salir de estos registros reales,
  // nunca de un numero quemado.
  getPendingSupportRecords(): PendingSupportRecord[] {
    return PENDING_SUPPORT_RECORDS;
  }

  // Antes de ejecucion (Pendiente de pago / Confirmada) la reserva admite modificaciones;
  // En ejecucion, Finalizada y Cancelada no admiten descuento adicional (RF-008/RF-003A).
  isEligibleForAdditionalDiscount(statusClass: string): boolean {
    return statusClass === 'is-pending' || statusClass === 'is-confirmed';
  }

  getAdjustment(code: string): ReservationAdjustment | null {
    return readAdjustments()[code] || null;
  }

  applyAdditionalDiscount(code: string, percentage: number, reason: string): void {
    const adjustments = readAdjustments();
    adjustments[code] = { percentage, reason, appliedAt: new Date().toISOString() };
    localStorage.setItem(ADJUSTMENTS_STORAGE_KEY, JSON.stringify(adjustments));
  }

  getReservation(code: string): OperatorReservation | undefined {
    const draft = this.draftSignal();
    const base = OPERATOR_RESERVATIONS[code];
    let reservation = draft?.code === code ? draft : base ? { ...base } : undefined;
    if (!reservation) return undefined;

    // El % de descuento adicional se recalcula siempre sobre el valor original
    // (OPERATOR_RESERVATIONS), nunca sobre un valor ya descontado guardado en el
    // draft, para no aplicarlo dos veces.
    const adjustment = this.getAdjustment(code);
    if (adjustment && base) {
      const newFinal = parseCOP(base.final) * (1 - adjustment.percentage / 100);
      const paidSoFar = parseCOP(reservation.paid);
      reservation = {
        ...reservation,
        final: formatCOP(newFinal),
        balance: formatCOP(Math.max(newFinal - paidSoFar, 0)),
        hasAdditionalDiscount: true,
      };
    }
    return reservation;
  }

  saveDraft(draft: OperatorReservation): void {
    this.draftSignal.set(draft);
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }

  updateDraft(patch: Partial<OperatorReservation>): OperatorReservation | null {
    const current = this.draftSignal();
    if (!current) return null;
    const updated = { ...current, ...patch };
    this.draftSignal.set(updated);
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
}
