import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ExecutionResponse, OperationApiService, OperationCostResponse } from '../../core/operation-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../core/http-error.util';
import { OperatorReservation, OperatorReservationService } from './operator-reservation.service';
import { SessionService } from '../../core/session.service';

export interface RegisteredExecution {
  reservation: OperatorReservation;
  execution: ExecutionResponse;
}

// Fuente real: OperationController (execution/costs). El estado "Confirmada" / "En
// ejecución" / "Finalizada" de ReservationStatus.java YA distingue por si solo si una
// reserva tiene ejecucion registrada o no - no hace falta un overlay local aparte como
// antes (RESERVATION_EXECUTIONS_KEY).
@Injectable({ providedIn: 'root' })
export class OperatorOperationService {
  private readonly operationApi = inject(OperationApiService);
  private readonly reservationService = inject(OperatorReservationService);
  private readonly sessionService = inject(SessionService);

  getUpcomingExecutions(): OperatorReservation[] {
    return this.reservationService.reservations().filter((r) => r.statusClass === 'is-confirmed');
  }

  async getRegisteredExecutions(): Promise<RegisteredExecution[]> {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) return [];
    const candidates = this.reservationService
      .reservations()
      .filter((r) => r.statusClass === 'is-execution' || r.statusClass === 'is-finalized');
    const results: RegisteredExecution[] = [];
    for (const reservation of candidates) {
      try {
        const execution = await firstValueFrom(this.operationApi.getExecution(tenantId, reservation.code));
        results.push({ reservation, execution });
      } catch {
        /* sin ejecucion real registrada todavia para esta reserva */
      }
    }
    return results;
  }

  canRegisterExecution(reservation: OperatorReservation): boolean {
    return reservation.statusClass === 'is-confirmed';
  }

  async registerExecution(
    code: string,
    served: boolean,
    executed: number,
    causal: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    if (!tenantId || !actorId) return { ok: false, message: 'No hay una sesión activa.' };
    try {
      await firstValueFrom(
        this.operationApi.registerExecution(tenantId, code, {
          served,
          executed: served ? Math.max(0, executed) : null,
          causal: served ? null : causal,
          actorId,
        }),
      );
      await this.reservationService.refresh();
      return { ok: true };
    } catch (error: unknown) {
      return { ok: false, message: this.mapError(error) };
    }
  }

  async finalizeExecution(code: string): Promise<{ ok: true } | { ok: false; message: string }> {
    const result = await this.reservationService.finalize(code);
    return result;
  }

  async registerCost(
    reservationCode: string,
    concept: string,
    amount: number,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    if (!tenantId || !actorId) return { ok: false, message: 'No hay una sesión activa.' };
    try {
      await firstValueFrom(this.operationApi.registerCost(tenantId, reservationCode, { concept, amount, actorId }));
      return { ok: true };
    } catch (error: unknown) {
      return { ok: false, message: this.mapError(error) };
    }
  }

  async getAllCosts(): Promise<OperationCostResponse[]> {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId) return [];
    const registered = await this.getRegisteredExecutions();
    const results: OperationCostResponse[] = [];
    for (const { reservation } of registered) {
      const costs = await firstValueFrom(this.operationApi.listCosts(tenantId, reservation.code));
      results.push(...costs);
    }
    return results;
  }

  private mapError(error: unknown): string {
    const err = error as { status?: number; error?: { message?: string } };
    if (err?.status === 409) return err.error?.message || 'La reserva no admite esta acción en su estado actual.';
    if (err?.status === 400) return err.error?.message || 'Revisa los datos ingresados.';
    if (err?.status === 404) return 'La reserva no existe.';
    if (isNetworkError(err)) return NETWORK_ERROR_MESSAGE;
    return 'No fue posible completar la operación.';
  }
}
