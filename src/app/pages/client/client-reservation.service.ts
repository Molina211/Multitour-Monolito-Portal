import { Injectable, signal } from '@angular/core';

// Estados PDR de una reserva (Seccion 16 "Estados y ciclos de vida"). Toda reserva del
// Cliente se muestra con uno de estos 5 valores, nunca un texto ad-hoc.
export const CLIENT_RESERVATION_STATES = ['Pendiente de pago', 'Confirmada', 'En ejecución', 'Finalizada', 'Cancelada'] as const;
export type ClientReservationStatus = (typeof CLIENT_RESERVATION_STATES)[number];

export interface ClientReservation {
  code: string;
  experience: string;
  startDate: string;
  endDate: string;
  travelers: string;
  status: string;
  budget?: string;
  projectedValue?: string;
  discountValue?: string;
  finalValue?: string;
  tourKey?: string;
  savedAt?: string;
}

// Misma clave ya usada como "reserva activa/mas reciente" en la landing aprobada
// (app.js: multitour-dashboard-booking).
const CURRENT_BOOKING_KEY = 'multitour-dashboard-booking';
// Misma clave ya usada como historial propio del Cliente en la landing aprobada
// (app.js: multitour-client-reservations).
const HISTORY_KEY = 'multitour-client-reservations';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeClientReservationStatus(rawStatus: string | undefined): ClientReservationStatus {
  const exact = CLIENT_RESERVATION_STATES.find((state) => state.toLowerCase() === String(rawStatus || '').toLowerCase());
  if (exact) return exact;
  if (String(rawStatus || '').toLowerCase().includes('pendiente')) return 'Pendiente de pago';
  return 'Confirmada';
}

// Simulacion local (localStorage), mismas claves ya usadas en la landing aprobada.
// BACKEND/SESION FALTANTE: no existe hoy una sesion real de Cliente autenticado ni un
// endpoint que separe reservas por cliente; este servicio representa unicamente "las
// reservas guardadas en este navegador", igual que ya hacia la landing. No mezcla datos de
// otros tenants ni clientes porque no existe ningun almacenamiento global compartido: cada
// navegador/sesion tiene su propio localStorage.
@Injectable({ providedIn: 'root' })
export class ClientReservationService {
  private readonly currentBookingSignal = signal<ClientReservation | null>(readStorage(CURRENT_BOOKING_KEY, null));
  private readonly historySignal = signal<ClientReservation[]>(readStorage(HISTORY_KEY, []));

  readonly history = this.historySignal.asReadonly();

  // La "reserva activa" es la mas reciente del Cliente, salvo que ya este en un estado
  // terminal (Finalizada/Cancelada): esas no cuentan como activas, aunque siguen
  // disponibles en el historial ("Ver mis reservas").
  activeReservation(): ClientReservation | null {
    const booking = this.currentBookingSignal();
    if (!booking) return null;
    const status = normalizeClientReservationStatus(booking.status);
    return status === 'Finalizada' || status === 'Cancelada' ? null : booking;
  }

  recordReservation(booking: ClientReservation): void {
    this.currentBookingSignal.set(booking);
    localStorage.setItem(CURRENT_BOOKING_KEY, JSON.stringify(booking));

    const history = [...this.historySignal()];
    const normalized: ClientReservation = { ...booking, status: normalizeClientReservationStatus(booking.status) };
    const index = history.findIndex((item) => item.code === normalized.code);
    if (index === -1) history.unshift(normalized);
    else history[index] = normalized;
    this.historySignal.set(history);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}
