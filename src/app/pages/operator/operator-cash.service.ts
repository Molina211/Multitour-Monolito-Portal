import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  CashApiService,
  CashMovementLabel,
  CashRegisterResponse,
  MonthlyConsolidationResponse,
} from '../../core/cash-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../core/http-error.util';
import { SessionService } from '../../core/session.service';

const TENANT_TIMEZONE = 'America/Bogota';

export function formatTenantDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString('es-CO', { timeZone: TENANT_TIMEZONE });
}

function getTenantDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TENANT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export interface CashTotals {
  ingresos: number;
  pagosOperacionales: number;
  gastos: number;
}

// Fuente real: CashController (POST/GET /api/tenants/{tenantId}/cash*). El total de la
// jornada (totalAmount) ya viene calculado por el Backend (base + movimientos), no se
// recalcula en el Frontend. BLOQUEO/INCOMPATIBILIDAD: CashRegisterResponse no expone un
// campo "devoluciones" por jornada (esa cifra solo existe agregada por periodo en
// MonthlyConsolidationResponse) - la tarjeta diaria de Caja ya no muestra esa fila; se
// mantiene unicamente en Consolidación mensual, donde si es un campo real.
@Injectable({ providedIn: 'root' })
export class OperatorCashService {
  private readonly cashApi = inject(CashApiService);
  private readonly sessionService = inject(SessionService);

  private readonly currentSignal = signal<CashRegisterResponse | null>(null);
  private readonly historySignal = signal<CashRegisterResponse[]>([]);
  private readonly consolidationSignal = signal<MonthlyConsolidationResponse[]>([]);

  loading = signal(false);
  error = signal('');
  notOpenToday = signal(false);

  current = this.currentSignal.asReadonly();
  history = this.historySignal.asReadonly();
  consolidation = this.consolidationSignal.asReadonly();

  todayKey(): string {
    return getTenantDateKey();
  }

  async refreshToday(): Promise<void> {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) {
      this.error.set('No hay una sesión activa.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.notOpenToday.set(false);
    try {
      const day = await firstValueFrom(this.cashApi.getByBusinessDate(tenantId, this.todayKey()));
      this.currentSignal.set(day);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.currentSignal.set(null);
        this.notOpenToday.set(true);
      } else {
        this.error.set(this.mapError(error));
      }
    } finally {
      this.loading.set(false);
    }
  }

  computeTotals(day: CashRegisterResponse): CashTotals {
    return day.movements.reduce(
      (totals, movement) => {
        if (movement.type === 'Ingreso') totals.ingresos += movement.amount;
        if (movement.type === 'Pago operacional') totals.pagosOperacionales += Math.abs(movement.amount);
        if (movement.type === 'Gasto') totals.gastos += Math.abs(movement.amount);
        return totals;
      },
      { ingresos: 0, pagosOperacionales: 0, gastos: 0 },
    );
  }

  async open(baseAmount: number): Promise<{ ok: true } | { ok: false; message: string }> {
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    if (!tenantId || !actorId) return { ok: false, message: 'No hay una sesión activa.' };
    try {
      const day = await firstValueFrom(this.cashApi.open(tenantId, { businessDate: this.todayKey(), baseAmount, actorId }));
      this.currentSignal.set(day);
      this.notOpenToday.set(false);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: this.mapError(error) };
    }
  }

  async registerMovement(
    type: CashMovementLabel,
    concept: string,
    amount: number,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    const current = this.currentSignal();
    if (!tenantId || !actorId || !current) return { ok: false, message: 'No hay una sesión activa o la caja no está abierta.' };
    try {
      const day = await firstValueFrom(
        this.cashApi.registerMovement(tenantId, current.cashRegisterId, { type, amount, concept, actorId }),
      );
      this.currentSignal.set(day);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: this.mapError(error) };
    }
  }

  async closeDay(): Promise<{ ok: true } | { ok: false; message: string }> {
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    const current = this.currentSignal();
    if (!tenantId || !actorId || !current) return { ok: false, message: 'No hay una sesión activa o la caja no está abierta.' };
    try {
      const day = await firstValueFrom(this.cashApi.close(tenantId, current.cashRegisterId, { actorId }));
      this.currentSignal.set(day);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: this.mapError(error) };
    }
  }

  async refreshHistory(): Promise<void> {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) return;
    this.loading.set(true);
    try {
      const history = await firstValueFrom(this.cashApi.listHistory(tenantId));
      this.historySignal.set(history.slice().sort((a, b) => b.businessDate.localeCompare(a.businessDate)));
    } catch (error) {
      this.error.set(this.mapError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async addCorrection(cashRegisterId: string, justification: string): Promise<{ ok: true } | { ok: false; message: string }> {
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    if (!tenantId || !actorId) return { ok: false, message: 'No hay una sesión activa.' };
    try {
      const updated = await firstValueFrom(this.cashApi.addCorrection(tenantId, cashRegisterId, { justification, actorId }));
      this.historySignal.set(this.historySignal().map((c) => (c.cashRegisterId === updated.cashRegisterId ? updated : c)));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: this.mapError(error) };
    }
  }

  async refreshMonthlyConsolidation(period: string): Promise<void> {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) return;
    this.loading.set(true);
    try {
      const consolidation = await firstValueFrom(this.cashApi.getMonthlyConsolidation(tenantId, period));
      this.consolidationSignal.set(consolidation);
    } catch (error) {
      this.error.set(this.mapError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private mapError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) return error.error?.message || 'La caja no admite esta acción en su estado actual.';
      if (error.status === 400) return error.error?.message || 'Revisa los datos ingresados.';
      if (error.status === 404) return 'No existe una jornada de caja para esa fecha.';
      if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
    }
    return 'No fue posible completar la operación.';
  }
}
