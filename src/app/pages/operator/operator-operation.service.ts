import { Injectable, inject } from '@angular/core';
import { OperatorReservation, OperatorReservationService } from './operator-reservation.service';

// Ejecucion real de servicios (RF-007, linea 447): registra lo efectivamente prestado y
// no prestado, con causal obligatoria si no se presto (RN-EJE-005), y la diferencia entre
// lo reservado y lo ejecutado (RN-EJE-003). Al registrarse, la reserva inicia "En ejecución".
export interface ReservationExecution {
  reserved: number;
  served: boolean;
  executed: number;
  causal: string;
  registeredAt: string;
  registeredBy: string;
}

// Costos operacionales (RF-009, linea 469): solo pueden registrarse sobre una ejecucion
// real ya iniciada y quedan siempre asociados a esa ejecucion (RN-OPE-001); nunca como
// costo generico sin operacion relacionada.
export interface OperationCost {
  id: string;
  reservationCode: string;
  concept: string;
  amount: number;
  registeredAt: string;
  registeredBy: string;
}

export interface UpcomingExecution extends OperatorReservation {}

export interface RegisteredExecution {
  reservation: OperatorReservation;
  execution: ReservationExecution;
}

// Misma clave ya usada en la landing aprobada (app.js: OPERATOR_RESERVATION_EXECUTIONS_KEY).
const RESERVATION_EXECUTIONS_KEY = 'multitour-reservation-executions';
// Misma clave ya usada en la landing aprobada (app.js: OPERATOR_OPERATION_COSTS_KEY).
const OPERATION_COSTS_KEY = 'multitour-operation-costs';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Simulacion local (localStorage), mismas claves ya usadas en la landing aprobada. No
// modifica OperatorReservationService.getReservation(): la ejecucion registrada solo se
// refleja dentro de esta pantalla (Operación y costos) y su propio flujo de registro,
// igual que en la landing, para no alterar el comportamiento de otras pantallas.
@Injectable({ providedIn: 'root' })
export class OperatorOperationService {
  private readonly reservationService = inject(OperatorReservationService);

  private getExecutions(): Record<string, ReservationExecution> {
    return readStorage<Record<string, ReservationExecution>>(RESERVATION_EXECUTIONS_KEY, {});
  }

  private saveExecutions(all: Record<string, ReservationExecution>): void {
    localStorage.setItem(RESERVATION_EXECUTIONS_KEY, JSON.stringify(all));
  }

  getExecution(code: string): ReservationExecution | null {
    return this.getExecutions()[code] || null;
  }

  // Misma cadena de resolucion ya usada por OperatorReservationService.getReservation():
  // aplica cancelacion (terminal) o, si no hay cancelacion, la ejecucion real registrada,
  // para que "Operación y costos" nunca muestre un estado desactualizado.
  resolveForOperation(code: string): OperatorReservation | undefined {
    const reservation = this.reservationService.getReservation(code);
    if (!reservation) return undefined;
    if (reservation.statusClass === 'is-cancelled') return reservation;
    const execution = this.getExecution(code);
    if (!execution) return reservation;
    return { ...reservation, status: 'En ejecución', statusClass: 'is-execution', execution: 'En ejecución' };
  }

  // Regla 1 (CORREGIR): el contador de "próximas" sale siempre de las ejecuciones
  // pendientes reales, nunca de un numero quemado.
  getUpcomingExecutions(): UpcomingExecution[] {
    return this.reservationService.reservationCodesInOrder
      .map((code) => this.resolveForOperation(code))
      .filter((reservation): reservation is OperatorReservation => !!reservation && reservation.execution === 'Pendiente de ejecución');
  }

  // Regla 4: solo se listan ejecuciones realmente registradas, sin inventar datos.
  getRegisteredExecutions(): RegisteredExecution[] {
    const result: RegisteredExecution[] = [];
    for (const code of this.reservationService.reservationCodesInOrder) {
      const execution = this.getExecution(code);
      if (!execution) continue;
      const reservation = this.resolveForOperation(code);
      if (!reservation) continue;
      result.push({ reservation, execution });
    }
    return result;
  }

  // Regla 5: no se permite iniciar ejecucion mientras la reserva no cumpla la condicion
  // de pago vigente (Confirmada).
  canRegisterExecution(reservation: OperatorReservation): boolean {
    return reservation.statusClass === 'is-confirmed' && !this.getExecution(reservation.code);
  }

  registerExecution(code: string, served: boolean, executed: number, causal: string, actor: string): ReservationExecution | null {
    const reservation = this.reservationService.getReservation(code);
    if (!reservation || reservation.statusClass !== 'is-confirmed' || this.getExecution(code)) return null;
    const execution: ReservationExecution = {
      reserved: reservation.travelers,
      served,
      executed: served ? Math.max(0, executed) : 0,
      causal: served ? '' : causal,
      registeredAt: new Date().toISOString(),
      registeredBy: actor,
    };
    const all = this.getExecutions();
    all[code] = execution;
    this.saveExecutions(all);
    return execution;
  }

  private getCosts(): OperationCost[] {
    return readStorage<OperationCost[]>(OPERATION_COSTS_KEY, []);
  }

  getAllCosts(): OperationCost[] {
    return this.getCosts();
  }

  private saveCosts(costs: OperationCost[]): void {
    localStorage.setItem(OPERATION_COSTS_KEY, JSON.stringify(costs));
  }

  // Regla 3 (RF-009, precondicion "Ejecucion iniciada"): "Registrar costo" solo se
  // habilita sobre una ejecucion real ya registrada; nunca un costo generico sin
  // operacion relacionada.
  registerCost(reservationCode: string, concept: string, amount: number, actor: string): OperationCost | null {
    if (!reservationCode || !this.getExecution(reservationCode)) return null;
    if (!concept || !amount || amount <= 0) return null;
    const cost: OperationCost = {
      id: `costo-${Date.now()}`,
      reservationCode,
      concept,
      amount,
      registeredAt: new Date().toISOString(),
      registeredBy: actor,
    };
    const costs = this.getCosts();
    costs.push(cost);
    this.saveCosts(costs);
    return cost;
  }
}
