import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CatalogApiService } from '../../core/catalog-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../core/http-error.util';
import { formatCOPOrDefault } from '../../core/money.util';
import { PAYMENT_METHOD_LABEL } from '../../core/payment-api.service';
import { ReservationApiService, ReservationResponse } from '../../core/reservation-api.service';
import { SessionService } from '../../core/session.service';

export interface CompanionRecord {
  name: string;
  document: string;
  birthDate: string;
}

// BLOQUEO/INCOMPATIBILIDAD: no existe hoy un endpoint que resuelva nombre/correo de un
// END_CUSTOMER a partir de su membershipId (CollaboratorController solo lista
// ADMINISTRATOR/OPERATIONAL_COLLABORATOR, no clientes). "customer"/"email" muestran el
// customerId real (membershipId) en vez de un nombre inventado.
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
  holderDocument?: string;
  companionRecords?: CompanionRecord[];
  transportSelected?: string;
  hasAdditionalDiscount?: boolean;
  refundOrigin?: { causal: string; potentialAmount: string; status: string };
  createdAt: string;
  cancelledAt?: string;
}

const STATUS_CLASS: Record<string, string> = {
  'Pendiente de pago': 'is-pending',
  Confirmada: 'is-confirmed',
  'En ejecución': 'is-execution',
  Finalizada: 'is-finalized',
  Cancelada: 'is-cancelled',
};

function formatCOP(value: number | null | undefined): string {
  return formatCOPOrDefault(value, '$0');
}

// Fuente real: GET /api/tenants/{tenantId}/reservations (Administrador/Colaborador, sin
// restriccion por cliente). Reemplaza los 6 registros demo y las multiples claves de
// localStorage (ajustes, soportes, seguimientos, devoluciones, cancelaciones,
// modificaciones, movimientos de pago) que existian antes: casi todos esos datos ya vienen
// resueltos directamente en ReservationResponse (finalValue, paymentStatus, pendingBalance,
// refundDecisionStatus, cancellationReason, modificationReason, etc.), sin necesidad de
// mantenerlos por separado.
@Injectable({ providedIn: 'root' })
export class OperatorReservationService {
  private readonly reservationApi = inject(ReservationApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly sessionService = inject(SessionService);

  private readonly rawSignal = signal<ReservationResponse[]>([]);
  private readonly catalogNameByIdSignal = signal<Map<string, string>>(new Map());
  readonly loading = signal(false);
  readonly error = signal('');

  readonly reservations = computed<OperatorReservation[]>(() =>
    [...this.rawSignal()]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .map((r) => this.toDisplay(r)),
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
        firstValueFrom(this.reservationApi.listByTenant(tenantId)),
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

  getReservation(code: string): OperatorReservation | undefined {
    return this.reservations().find((r) => r.code === code);
  }

  findRaw(code: string): ReservationResponse | undefined {
    return this.rawSignal().find((r) => r.reservationId === code);
  }

  // Antes de ejecucion (Pendiente de pago / Confirmada) la reserva admite descuento
  // adicional (RF-008/RF-003A).
  isEligibleForAdditionalDiscount(statusClass: string): boolean {
    return statusClass === 'is-pending' || statusClass === 'is-confirmed';
  }

  // "Cancelar o modificar reserva" solo esta disponible antes de Finalizada/Cancelada.
  isEligibleForCancelOrModify(statusClass: string): boolean {
    return statusClass !== 'is-finalized' && statusClass !== 'is-cancelled';
  }

  async applyAdditionalDiscount(
    code: string,
    percentage: number,
    reason: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    return this.mutate(code, (tenantId, actorId) =>
      this.reservationApi.applyDiscount(tenantId, code, { percentage, reason, actorId }),
    );
  }

  async cancel(code: string, reason: string): Promise<{ ok: true } | { ok: false; message: string }> {
    return this.mutate(code, (tenantId, actorId) => this.reservationApi.cancel(tenantId, code, { reason, actorId }));
  }

  async modify(
    code: string,
    reservedServices: { serviceReference: string; partySize: number | null; scheduledDate: string | null; transportItemId: string | null }[],
    projectedValue: number | null,
    reason: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    return this.mutate(code, (tenantId, actorId) =>
      this.reservationApi.modify(tenantId, code, { reservedServices, projectedValue, finalValue: null, reason, actorId }),
    );
  }

  async finalize(code: string): Promise<{ ok: true } | { ok: false; message: string }> {
    return this.mutate(code, (tenantId, actorId) => this.reservationApi.finalize(tenantId, code, { actorId }));
  }

  async requestRefund(code: string, amount: number, reason: string, method: string): Promise<{ ok: true } | { ok: false; message: string }> {
    return this.mutate(code, (tenantId, actorId) => this.reservationApi.refund(tenantId, code, { amount, reason, actorId, method }));
  }

  async authorizeRefund(code: string, note: string): Promise<{ ok: true } | { ok: false; message: string }> {
    return this.mutate(code, (tenantId, actorId) => this.reservationApi.authorizeRefund(tenantId, code, { actorId, note: note || null }));
  }

  async rejectRefund(code: string, reason: string): Promise<{ ok: true } | { ok: false; message: string }> {
    return this.mutate(code, (tenantId, actorId) => this.reservationApi.rejectRefund(tenantId, code, { actorId, reason }));
  }

  async registerRefundAsCreditBalance(code: string): Promise<{ ok: true } | { ok: false; message: string }> {
    return this.mutate(code, (tenantId, actorId) => this.reservationApi.registerRefundAsCreditBalance(tenantId, code, { actorId }));
  }

  private async mutate(
    code: string,
    call: (tenantId: string, actorId: string) => import('rxjs').Observable<ReservationResponse>,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    if (!tenantId || !actorId) return { ok: false, message: 'No hay una sesión activa.' };
    try {
      const updated = await firstValueFrom(call(tenantId, actorId));
      this.rawSignal.set(this.rawSignal().map((r) => (r.reservationId === updated.reservationId ? updated : r)));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: this.mapError(error) };
    }
  }

  private toDisplay(r: ReservationResponse): OperatorReservation {
    const service = r.reservedServices[0];
    const finalOrProjected = r.finalValue ?? r.projectedValue;
    const paidAmount = r.pendingBalance != null ? finalOrProjected - r.pendingBalance : 0;
    const discountAmount = r.finalValue != null ? Math.max(r.projectedValue - r.finalValue, 0) : 0;
    const status = r.reservationStatus;
    const statusClass = STATUS_CLASS[status] || 'is-pending';

    let execution = 'Pendiente de ejecución';
    if (status === 'En ejecución') execution = 'En ejecución';
    else if (status === 'Finalizada') execution = 'Finalizada';
    else if (status === 'Cancelada') execution = 'No ejecutada';

    let action = 'Ver detalle';
    if (status === 'Cancelada') action = 'Ver pago';
    else if (r.paymentStatus !== 'Pagado' && (status === 'Pendiente de pago' || status === 'Confirmada')) action = 'Gestionar pago';
    else if (status === 'En ejecución' || status === 'Finalizada') action = 'Ver operación';

    return {
      code: r.reservationId,
      customer: r.customerId,
      email: 'No disponible en la API',
      service: (service && this.catalogNameByIdSignal().get(service.serviceReference)) || service?.serviceReference || 'Servicio',
      date: service?.scheduledDate || '',
      travelers: service?.partySize ?? 0,
      companions: `${r.companions.length} registrado(s)`,
      status,
      statusClass,
      projected: formatCOP(r.projectedValue),
      discount: discountAmount > 0 ? `-${formatCOP(discountAmount)}` : '$0',
      final: formatCOP(finalOrProjected),
      paid: formatCOP(paidAmount),
      balance: formatCOP(r.pendingBalance ?? 0),
      payment: r.paymentStatus,
      method: (r.paymentMethod && PAYMENT_METHOD_LABEL[r.paymentMethod]) || r.paymentMethod || 'Sin modalidad definida',
      execution,
      action,
      holderDocument: r.holderDocument || undefined,
      companionRecords: r.companions.map((c) => ({ name: c.name, document: c.document, birthDate: c.birthDate || '' })),
      transportSelected: service?.transportItemId
        ? this.catalogNameByIdSignal().get(service.transportItemId) || service.transportItemId
        : undefined,
      hasAdditionalDiscount: discountAmount > 0,
      createdAt: r.createdAt,
      cancelledAt: r.cancelledAt || undefined,
      refundOrigin:
        r.refundDecisionStatus && r.refundDecisionStatus !== 'Rechazada'
          ? {
              causal: r.refundReason || r.cancellationReason || r.modificationReason || 'No especificado',
              potentialAmount: formatCOP(r.refundedAmount),
              status: r.refundDecisionStatus,
            }
          : undefined,
    };
  }

  private mapError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) return 'Tu sesión no tiene acceso a esta operación.';
      if (error.status === 404) return 'La reserva no existe.';
      if (error.status === 409) return error.error?.message || 'La reserva no admite esta acción en su estado actual.';
      if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
      if (error.status === 400) return error.error?.message || 'Revisa los datos ingresados.';
    }
    return 'No fue posible completar la operación.';
  }
}
