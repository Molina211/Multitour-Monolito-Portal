import { Injectable, signal } from '@angular/core';

export type RefundStatus = 'Pendiente de autorización' | 'Autorizada' | 'Rechazada' | 'Ejecutada' | 'Saldo a favor pendiente';

export interface RefundRequest {
  id: string;
  reservationCode: string;
  customer: string;
  reason: string;
  administrativeNote?: string;
  amount: string;
  status: RefundStatus;
  requestedAt: string;
  authorizedBy?: string;
  authorizedAt?: string;
  authorizationNote?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  executedBy?: string;
  executedAt?: string;
  exitMethod?: string;
  cashMovementRef?: string;
  // No existe en el PDR ninguna formula/tabla parametrizada para calcular el valor a
  // devolver: mientras esto sea true, no puede autorizarse ni ejecutarse la devolucion.
  pendingCalculation?: boolean;
}

const REFUND_REQUESTS_KEY = 'multitour-refund-requests';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Devoluciones monetarias (RF-015B): sin datos de demostracion quemados. La lista
// empieza vacia hasta que exista un flujo real que registre una solicitud.
// Simulacion local (localStorage), misma clave "multitour-refund-requests" ya usada en la landing aprobada.
@Injectable({ providedIn: 'root' })
export class OperatorRefundService {
  private readonly requestsSignal = signal<RefundRequest[]>(readStorage(REFUND_REQUESTS_KEY, []));
  readonly requests = this.requestsSignal.asReadonly();

  getRequest(id: string): RefundRequest | undefined {
    return this.requestsSignal().find((item) => item.id === id);
  }

  getRequestByReservation(reservationCode: string): RefundRequest | undefined {
    return this.requestsSignal().find((item) => item.reservationCode === reservationCode);
  }

  // Origen de una solicitud de devolucion (RF-015B): usa SIEMPRE la MISMA reserva, sin
  // inventar causal ni monto (deben venir ya registrados en la reserva de origen).
  // No crea otra reserva; solo agrega la solicitud a la lista existente.
  createFromReservation(
    reservationCode: string,
    customer: string,
    reason: string,
    amount: string,
    pendingCalculation: boolean,
    administrativeNote?: string,
  ): RefundRequest {
    const request: RefundRequest = {
      id: `refund-${Date.now()}`,
      reservationCode,
      customer,
      reason,
      administrativeNote: administrativeNote || undefined,
      amount,
      pendingCalculation,
      status: 'Pendiente de autorización',
      requestedAt: new Date().toISOString().slice(0, 10),
    };
    this.persist([...this.requestsSignal(), request]);
    return request;
  }

  private persist(list: RefundRequest[]): void {
    this.requestsSignal.set(list);
    localStorage.setItem(REFUND_REQUESTS_KEY, JSON.stringify(list));
  }

  private applyUpdate(id: string, patch: Partial<RefundRequest>): RefundRequest | null {
    const list = this.requestsSignal();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const updated: RefundRequest = { ...list[index], ...patch };
    const next = [...list];
    next[index] = updated;
    this.persist(next);
    return updated;
  }

  // Solo el Administrador puede autorizar (RF-015B). Actualiza SIEMPRE la MISMA solicitud
  // y conserva el motivo de autorizacion sin borrarlo en pasos posteriores.
  authorize(id: string, note: string, actor: string): RefundRequest | null {
    return this.applyUpdate(id, {
      status: 'Autorizada',
      authorizedBy: actor,
      authorizedAt: new Date().toISOString(),
      authorizationNote: note,
    });
  }

  // Solo el Administrador del operador (Tenant Admin) puede rechazar. El rechazo NO
  // ejecuta ninguna salida de dinero (eso queda como paso posterior y separado):
  // simplemente cierra la decision de autorizacion como negada, con motivo obligatorio.
  reject(id: string, reason: string, actor: string): RefundRequest | null {
    return this.applyUpdate(id, {
      status: 'Rechazada',
      rejectedBy: actor,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
    });
  }

  // NO se marca "Ejecutada" si no hubo salida real de dinero: en ese caso el resultado
  // queda como saldo a favor pendiente (RF-015B).
  executeWithOutflow(id: string, method: string, cashMovementRef: string, actor: string): RefundRequest | null {
    return this.applyUpdate(id, {
      status: 'Ejecutada',
      executedBy: actor,
      executedAt: new Date().toISOString(),
      exitMethod: method,
      cashMovementRef,
    });
  }

  registerAsCreditBalance(id: string, actor: string): RefundRequest | null {
    return this.applyUpdate(id, {
      status: 'Saldo a favor pendiente',
      executedBy: actor,
      executedAt: new Date().toISOString(),
    });
  }
}
