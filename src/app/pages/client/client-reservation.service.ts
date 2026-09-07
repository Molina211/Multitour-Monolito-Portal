import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CatalogApiService } from '../../core/catalog-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../core/http-error.util';
import { formatCOPOrDefault } from '../../core/money.util';
import { PAYMENT_METHOD_LABEL } from '../../core/payment-api.service';
import { ReservationApiService, ReservationResponse } from '../../core/reservation-api.service';
import { GetMyReservationsUseCase } from '../../core/reservation/application/get-my-reservations.use-case';
import { SessionService } from '../../core/session.service';

// Estados PDR de una reserva (Seccion 16 "Estados y ciclos de vida"). Coinciden EXACTO con
// los labels reales de ReservationStatus.java (alineados a proposito por el Backend).
export const CLIENT_RESERVATION_STATES = ['Pendiente de pago', 'Confirmada', 'En ejecución', 'Finalizada', 'Cancelada'] as const;
export type ClientReservationStatus = (typeof CLIENT_RESERVATION_STATES)[number];

export interface CompanionRecord {
  name: string;
  document: string;
  birthDate: string;
}

// Coinciden EXACTO con los labels reales de PaymentStatus.java.
export const CLIENT_PAYMENT_STATES = ['Sin pago', 'En validación', 'Parcial', 'Pagado', 'Rechazado', 'Devuelto parcial o total', 'Saldo a favor pendiente'] as const;
export type ClientPaymentStatus = (typeof CLIENT_PAYMENT_STATES)[number];

// Vista de presentacion de un ReservationResponse real (GET .../reservations/me). Se
// mantiene esta misma forma (en vez del DTO crudo) para no tener que reescribir las 4
// pantallas que ya consumian "code/experience/budget/...": solo cambio la fuente de datos.
export interface ClientReservation {
  code: string;
  experience: string;
  startDate: string;
  endDate: string;
  travelers: string;
  status: string;
  budget?: string;
  projectedValue?: string;
  finalValue?: string;
  tourKey?: string;
  savedAt?: string;
  holderDocument?: string;
  companions?: CompanionRecord[];
  transportSelected?: string;
  method?: string;
  paymentStatus?: ClientPaymentStatus | string;
  paid?: string;
  balance?: string;
}

function formatCurrency(value: number | null | undefined): string {
  return formatCOPOrDefault(value, '$0');
}

export function toPaymentMethodLabel(method: string | null | undefined): string {
  return (method && PAYMENT_METHOD_LABEL[method]) || method || '';
}

export function normalizeClientReservationStatus(rawStatus: string | undefined): ClientReservationStatus {
  const exact = CLIENT_RESERVATION_STATES.find((state) => state.toLowerCase() === String(rawStatus || '').toLowerCase());
  return exact || 'Pendiente de pago';
}

// Fuente real: GET /api/tenants/{tenantId}/reservations/me (JWT END_CUSTOMER). Reemplaza la
// simulacion local (localStorage) que existia antes.
@Injectable({ providedIn: 'root' })
export class ClientReservationService {
  private readonly reservationApi = inject(ReservationApiService);
  private readonly getMyReservations = inject(GetMyReservationsUseCase);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly sessionService = inject(SessionService);

  private readonly rawSignal = signal<ReservationResponse[]>([]);
  private readonly catalogNameByIdSignal = signal<Map<string, string>>(new Map());
  readonly loading = signal(false);
  readonly error = signal('');

  readonly history = computed<ClientReservation[]>(() =>
    [...this.rawSignal()]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .map((reservation) => this.toDisplay(reservation)),
  );

  async refresh(): Promise<void> {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) {
      this.error.set('No hay una sesión activa.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const [reservations, catalog] = await Promise.all([
        firstValueFrom(this.getMyReservations.execute(tenantId)),
        firstValueFrom(this.catalogApi.listByTenant(tenantId)),
      ]);
      this.catalogNameByIdSignal.set(new Map(catalog.map((item) => [item.catalogItemId, item.name])));
      this.rawSignal.set(reservations);
    } catch (error) {
      this.error.set(this.mapError(error));
    } finally {
      this.loading.set(false);
    }
  }

  // "Reserva activa" (Mi panel): la mas reciente sin estado terminal.
  activeReservation(): ClientReservation | null {
    return this.history().find((r) => r.status !== 'Finalizada' && r.status !== 'Cancelada') ?? null;
  }

  // "Ultima reserva" (Mi perfil -> Resumen): la mas reciente sin importar su estado.
  mostRecent(): ClientReservation | null {
    return this.history()[0] ?? null;
  }

  findRaw(reservationId: string): ReservationResponse | undefined {
    return this.rawSignal().find((r) => r.reservationId === reservationId);
  }

  async cancel(reservationId: string, reason: string): Promise<{ ok: true } | { ok: false; message: string }> {
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    if (!tenantId || !actorId) return { ok: false, message: 'No hay una sesión activa.' };
    try {
      const updated = await firstValueFrom(this.reservationApi.cancel(tenantId, reservationId, { reason, actorId }));
      this.rawSignal.set(this.rawSignal().map((r) => (r.reservationId === updated.reservationId ? updated : r)));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: this.mapError(error) };
    }
  }

  private toDisplay(reservation: ReservationResponse): ClientReservation {
    const service = reservation.reservedServices[0];
    const finalOrProjected = reservation.finalValue ?? reservation.projectedValue;
    const paidAmount = reservation.pendingBalance != null ? finalOrProjected - reservation.pendingBalance : null;
    return {
      code: reservation.reservationId,
      experience: (service && this.catalogNameByIdSignal().get(service.serviceReference)) || service?.serviceReference || 'Servicio',
      startDate: service?.scheduledDate || '',
      endDate: service?.scheduledDate || '',
      travelers: service?.partySize != null ? String(service.partySize) : '',
      status: reservation.reservationStatus,
      budget: formatCurrency(finalOrProjected),
      projectedValue: formatCurrency(reservation.projectedValue),
      finalValue: formatCurrency(finalOrProjected),
      tourKey: service?.serviceReference,
      savedAt: reservation.createdAt,
      holderDocument: reservation.holderDocument || '',
      companions: reservation.companions.map((c) => ({ name: c.name, document: c.document, birthDate: c.birthDate || '' })),
      transportSelected: service?.transportItemId
        ? this.catalogNameByIdSignal().get(service.transportItemId) || service.transportItemId
        : '',
      method: toPaymentMethodLabel(reservation.paymentMethod),
      paymentStatus: reservation.paymentStatus,
      paid: paidAmount != null && paidAmount > 0 ? formatCurrency(paidAmount) : undefined,
      balance: reservation.pendingBalance != null ? formatCurrency(reservation.pendingBalance) : undefined,
    };
  }

  private mapError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) return 'Tu sesión no tiene acceso a estas reservas.';
      if (error.status === 404) return 'La reserva no existe.';
      if (error.status === 409) return error.error?.message || 'La reserva no admite esta acción en su estado actual.';
      if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
    }
    return 'No fue posible completar la operación.';
  }
}
