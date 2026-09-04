import { Injectable, signal } from '@angular/core';

export interface OperatorReservation {
  code: string;
  // Fecha real de creacion (YYYY-MM-DD). Los registros base de demo no tienen este dato
  // historico (no existe, no se inventa): solo las reservas creadas en vivo via Crear
  // reserva reciben un createdAt real, igual a OPERATOR_TODAY_DATE.
  createdAt?: string;
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
  // Origen de una solicitud de devolucion (RF-015B): solo presente cuando la reserva ya
  // tiene una cancelacion o modificacion registrada con causal y valor potencial a devolver.
  refundOrigin?: RefundOrigin;
  // Documento del titular (RN-CLI-002): se conserva junto a la reserva para validar que no
  // se repita entre el titular y los acompañantes.
  holderDocument?: string;
  // Acompañantes individualizados (RN-CLI-002/RN-RES-005). BACKEND API FALTANTE —
  // ACOMPAÑANTES: el Backend actual solo recibe partySize (un numero), por lo que este
  // detalle se conserva unicamente en el mecanismo local del Frontend hasta que exista un
  // contrato real que lo soporte.
  companionRecords?: CompanionRecord[];
  // Transporte asociado a la reserva cuando aplica (RN-TRA-001/002). BACKEND API FALTANTE —
  // TRANSPORTE: el catalogo de transporte ya existe localmente (OperatorCatalogService),
  // pero no hay endpoint de Backend que lo modele como recurso de catalogo propio.
  transportSelected?: string;
}

// Acompañante individual de una reserva (RN-CLI-002/RN-RES-005): nombre, documento y fecha
// de nacimiento son los unicos datos respaldados por el PDR para todo viajero adicional.
export interface CompanionRecord {
  name: string;
  document: string;
  birthDate: string;
}

export interface RefundOrigin {
  type: 'Cancelación' | 'Modificación';
  causal: string;
  potentialAmount: string;
  // No existe en el PDR ninguna formula/tabla parametrizada para calcular el valor a
  // devolver: mientras esto sea true, potentialAmount es solo un texto de estado
  // ("pendiente de calculo"), nunca un monto, y no puede autorizarse ni ejecutarse.
  pendingCalculation: boolean;
  registeredAt: string;
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
  support: string;
  status: string;
  action: 'validate' | 'follow-up';
}

export interface PaymentSupportDecision {
  status: string;
  paid: string;
  balance: string;
  decidedAt: string;
}

export interface PaymentSupportLogEntry {
  reservation: string;
  action: 'approve' | 'reject';
  status: string;
  actor: string;
  reason: string;
  date: string;
  time: string;
}

export interface PaymentFollowupEntry {
  note: string;
  actor: string;
  date: string;
  time: string;
}

export interface ReservationCancellation {
  causal: string;
  registeredAt: string;
}

// Trazabilidad de abonos/pagos (CORREGIR: "la relacion economica no es consistente si
// $800.000 representa el total acumulado"). Cada pago/abono realmente registrado queda
// como un movimiento propio, en vez de reemplazar el historico por un unico numero.
export interface PaymentMovement {
  amount: string;
  method: string;
  registeredAt: string;
}

export interface ReservationModification {
  service: string;
  date: string;
  travelers: number;
  companions: string;
  projected: string;
  discount: string;
  final: string;
  balance: string;
  causal: string;
  registeredAt: string;
}

// No existe en el PDR ninguna formula o tabla parametrizada para calcular el valor a
// devolver (verificado exhaustivamente): toda solicitud de devolucion queda con el valor
// "pendiente de calculo" hasta que esa condicion comercial se defina, y no puede
// autorizarse ni ejecutarse mientras tanto.
export const REFUND_PENDING_CALCULATION_LABEL = 'Pendiente de parametrización comercial';

// Fecha de referencia ("hoy") ya usada y aprobada en el encabezado del dashboard del
// operador (dashboard.component.html: "Martes, 1 sep 2026"). Se reutiliza la misma, no se
// inventa una fecha nueva.
export const OPERATOR_TODAY_DATE = '2026-09-01';

const DRAFT_STORAGE_KEY = 'operatorReservationDraft';
// Misma clave ya usada en la landing aprobada (app.js: OPERATOR_RESERVATION_ADJUSTMENTS_KEY).
const ADJUSTMENTS_STORAGE_KEY = 'multitour-reservation-adjustments';
// Mismas claves ya usadas en la landing aprobada (app.js: OPERATOR_PAYMENT_SUPPORT_STATE_KEY / _LOG_KEY).
const PAYMENT_SUPPORT_STATE_KEY = 'multitour-payment-support-state';
const PAYMENT_SUPPORT_LOG_KEY = 'multitour-payment-support-log';
// Misma clave ya usada en la landing aprobada (app.js: OPERATOR_PAYMENT_FOLLOWUPS_KEY).
const PAYMENT_FOLLOWUPS_KEY = 'multitour-payment-followups';
// Misma clave ya usada en la landing aprobada (app.js: OPERATOR_REFUND_ORIGINS_KEY).
const REFUND_ORIGINS_KEY = 'multitour-refund-origins';
// Misma clave ya usada en la landing aprobada (app.js: OPERATOR_RESERVATION_CANCELLATIONS_KEY).
const RESERVATION_CANCELLATIONS_KEY = 'multitour-reservation-cancellations';
// Misma clave ya usada en la landing aprobada (app.js: OPERATOR_RESERVATION_MODIFICATIONS_KEY).
const RESERVATION_MODIFICATIONS_KEY = 'multitour-reservation-modifications';
// Misma clave ya usada por OperatorOperationService (Operación y costos): se lee aqui
// directamente (sin inyectar ese servicio, para no crear una dependencia circular) unicamente
// para que Reservas y Detalle de reserva reflejen el MISMO estado real de ejecucion/
// finalizacion, en vez de mostrar un estado desactualizado fuera de esa pantalla.
const RESERVATION_EXECUTIONS_KEY = 'multitour-reservation-executions';
// Historial de movimientos de pago/abono por reserva (trazabilidad, RN-RES-006).
const PAYMENT_MOVEMENTS_KEY = 'multitour-payment-movements';

interface ReservationExecutionOverlay {
  finalized?: boolean;
}
const RESOLVED_SUPPORT_STATUSES = ['Pagado', 'Parcial', 'Rechazado'];
const CANCEL_OR_MODIFY_INELIGIBLE_STATUSES = ['is-finalized', 'is-cancelled'];

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
  { code: 'RES-1842', customer: 'Laura Gómez', method: 'Transferencia', amount: '$1.039.200', support: 'comprobante-transferencia-RES-1842.pdf', status: 'En validación', action: 'validate' },
  { code: 'RES-1837', customer: 'Juliana Cruz', method: 'Abono', amount: '$800.000', support: '', status: 'Saldo pendiente', action: 'follow-up' },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

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
  // nunca de un numero quemado. El estado refleja la ultima decision registrada, si existe.
  getPendingSupportRecords(): PendingSupportRecord[] {
    const decisions = readStorage<Record<string, PaymentSupportDecision>>(PAYMENT_SUPPORT_STATE_KEY, {});
    return PENDING_SUPPORT_RECORDS.map((record) => {
      let result = record;
      const decision = decisions[record.code];
      if (decision) result = { ...result, status: decision.status };
      // BUG corregido: "Valor pendiente" para seguimiento (follow-up) era un monto fijo
      // desconectado del saldo real de la reserva (ej. RES-1837 mostraba $800.000 mientras
      // Detalle/Gestion de pago mostraban un saldo real de $2.078.400). Ahora se deriva del
      // MISMO saldo (OperatorReservation.balance), una sola fuente para todas las pantallas.
      if (record.action === 'follow-up') {
        const reservation = this.getReservation(record.code);
        if (reservation) result = { ...result, amount: reservation.balance };
      }
      return result;
    }).filter((record) => {
      // BUG corregido (RF-015/RN-RES-006A/006B): una reserva de seguimiento (Abono) ya
      // liquidada (saldo $0, Pagado) dejaba de ser un pago pendiente real, pero seguia
      // apareciendo en "Pagos pendientes" con "Registrar seguimiento" disponible. Solo
      // aplica a filas de seguimiento: las de validacion de soporte (Transferencia) siguen
      // su propio ciclo de decision, sin tocar ese flujo.
      if (record.action !== 'follow-up') return true;
      const reservation = this.getReservation(record.code);
      return !reservation || !(reservation.payment === 'Pagado' && reservation.balance === '$0');
    });
  }

  isPendingSupport(record: PendingSupportRecord): boolean {
    return !RESOLVED_SUPPORT_STATUSES.includes(record.status);
  }

  getPaymentSupportDecision(code: string): PaymentSupportDecision | null {
    return readStorage<Record<string, PaymentSupportDecision>>(PAYMENT_SUPPORT_STATE_KEY, {})[code] || null;
  }

  // Al aprobar: recalcula sobre la MISMA reserva (Pagado si cubre el saldo, Parcial si no).
  // Al rechazar: conserva el saldo pendiente sin tocarlo. Ambos casos quedan en la
  // bitacora de trazabilidad (append-only, nunca se sobrescribe un intento previo).
  decidePaymentSupport(code: string, action: 'approve' | 'reject', reason: string, actor: string): PaymentSupportDecision {
    const record = PENDING_SUPPORT_RECORDS.find((item) => item.code === code);
    const reservation = OPERATOR_RESERVATIONS[code];
    const decidedAt = new Date();

    let paid = reservation ? parseCOP(reservation.paid) : 0;
    let balance = reservation ? parseCOP(reservation.balance) : 0;
    let status: string;
    if (action === 'approve') {
      const validatedAmount = record ? parseCOP(record.amount) : 0;
      paid += validatedAmount;
      balance = reservation ? Math.max(0, parseCOP(reservation.final) - paid) : 0;
      status = balance === 0 ? 'Pagado' : 'Parcial';
    } else {
      status = 'Rechazado';
    }

    const decision: PaymentSupportDecision = { status, paid: formatCOP(paid), balance: formatCOP(balance), decidedAt: decidedAt.toISOString() };
    const decisions = readStorage<Record<string, PaymentSupportDecision>>(PAYMENT_SUPPORT_STATE_KEY, {});
    decisions[code] = decision;
    localStorage.setItem(PAYMENT_SUPPORT_STATE_KEY, JSON.stringify(decisions));

    const log = readStorage<PaymentSupportLogEntry[]>(PAYMENT_SUPPORT_LOG_KEY, []);
    log.push({
      reservation: code,
      action,
      status,
      actor,
      reason,
      date: decidedAt.toISOString().slice(0, 10),
      time: decidedAt.toTimeString().slice(0, 5),
    });
    localStorage.setItem(PAYMENT_SUPPORT_LOG_KEY, JSON.stringify(log));

    return decision;
  }

  // No existe hoy parametrizacion de tiempos (Configurar pagos) confirmada en el PDR ni en el
  // catalogo actual: se informa explicitamente en vez de inventar un plazo o vigencia.
  getPaymentDeadlineNote(_code: string): string {
    return 'Sin parametrización de plazo definida para esta modalidad.';
  }

  getFollowups(code: string): PaymentFollowupEntry[] {
    return readStorage<Record<string, PaymentFollowupEntry[]>>(PAYMENT_FOLLOWUPS_KEY, {})[code] || [];
  }

  // Historico de seguimientos: cada nota se agrega a la lista existente, nunca la reemplaza.
  addFollowup(code: string, note: string, actor: string): PaymentFollowupEntry {
    const now = new Date();
    const entry: PaymentFollowupEntry = { note, actor, date: now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5) };
    const all = readStorage<Record<string, PaymentFollowupEntry[]>>(PAYMENT_FOLLOWUPS_KEY, {});
    all[code] = [...(all[code] || []), entry];
    localStorage.setItem(PAYMENT_FOLLOWUPS_KEY, JSON.stringify(all));
    return entry;
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

    const refundOrigin = this.getRefundOrigin(code);
    if (refundOrigin) {
      reservation = { ...reservation, refundOrigin };
    }

    // Una modificacion registrada (RF-015A, linea 383) actualiza la MISMA reserva: nuevo
    // servicio/fecha/viajeros/hospedaje y sus valores recalculados. Los pagos ya
    // registrados no cambian.
    const modification = this.getReservationModification(code);
    if (modification) {
      reservation = {
        ...reservation,
        service: modification.service,
        date: modification.date,
        travelers: modification.travelers,
        companions: modification.companions,
        projected: modification.projected,
        discount: modification.discount,
        final: modification.final,
        balance: modification.balance,
      };
    }

    // La condicion de ejecucion depende del estado economico REAL de la reserva. Si el
    // soporte de pago ya fue decidido (Validar soporte), se refleja aqui con la MISMA regla
    // ya aprobada en Gestion de pago (saldo en 0 -> Confirmada; saldo pendiente -> sigue
    // Pendiente de pago), para que "Registrar ejecución" (Operación y costos) se habilite
    // cuando corresponda.
    const supportDecision = this.getPaymentSupportDecision(code);
    if (supportDecision && (supportDecision.status === 'Pagado' || supportDecision.status === 'Parcial')) {
      reservation = {
        ...reservation,
        paid: supportDecision.paid,
        balance: supportDecision.balance,
        payment: supportDecision.status,
        status: supportDecision.status === 'Pagado' ? 'Confirmada' : 'Pendiente de pago',
        statusClass: supportDecision.status === 'Pagado' ? 'is-confirmed' : 'is-pending',
      };
    }

    // Ejecucion/finalizacion (RF-007, Seccion 16 "Reserva" - transicion En ejecucion a
    // Finalizada): si Operación y costos ya registro una ejecucion para esta reserva, ese
    // estado real se refleja tambien en Reservas y Detalle de reserva. No cambia precio,
    // descuentos, pagos ni saldo: solo el estado de la reserva y de su ejecucion.
    const execution = readStorage<Record<string, ReservationExecutionOverlay>>(RESERVATION_EXECUTIONS_KEY, {})[code];
    if (execution) {
      reservation = execution.finalized
        ? { ...reservation, status: 'Finalizada', statusClass: 'is-finalized', execution: 'Finalizada' }
        : { ...reservation, status: 'En ejecución', statusClass: 'is-execution', execution: 'En ejecución' };
    }

    // Una cancelacion registrada (RF-008A, linea 972) siempre deja la reserva en
    // "Cancelada", tenga o no dinero pagado que devolver: nunca debe seguir mostrandose
    // en un estado anterior como "En ejecucion". El estado de ejecucion del servicio pasa
    // a "No ejecutada" (mismo valor ya confirmado para reservas canceladas, ej. RES-1822):
    // no se inventa un estado nuevo. Esto es independiente de si existe refundOrigin
    // (que solo aparece cuando ademas hay pagado > $0).
    if (this.getReservationCancellation(code)) {
      reservation = { ...reservation, status: 'Cancelada', statusClass: 'is-cancelled', execution: 'No ejecutada' };
    }
    return reservation;
  }

  // "Cancelar o modificar reserva" solo esta disponible antes de Finalizada/Cancelada
  // (RF-008A, linea 972): esos estados ya son terminales.
  isEligibleForCancelOrModify(statusClass: string): boolean {
    return !CANCEL_OR_MODIFY_INELIGIBLE_STATUSES.includes(statusClass);
  }

  getRefundOrigin(code: string): RefundOrigin | null {
    return readStorage<Record<string, RefundOrigin>>(REFUND_ORIGINS_KEY, {})[code] || null;
  }

  getReservationCancellation(code: string): ReservationCancellation | null {
    return readStorage<Record<string, ReservationCancellation>>(RESERVATION_CANCELLATIONS_KEY, {})[code] || null;
  }

  getAllReservationCancellations(): ReservationCancellation[] {
    return Object.values(readStorage<Record<string, ReservationCancellation>>(RESERVATION_CANCELLATIONS_KEY, {}));
  }

  // Trazabilidad de abonos: cada pago/abono realmente registrado (Gestión de pago) queda
  // como un movimiento propio, append-only, nunca se reemplaza por un unico numero.
  getPaymentMovements(code: string): PaymentMovement[] {
    return readStorage<Record<string, PaymentMovement[]>>(PAYMENT_MOVEMENTS_KEY, {})[code] || [];
  }

  addPaymentMovement(code: string, amount: string, method: string): void {
    const all = readStorage<Record<string, PaymentMovement[]>>(PAYMENT_MOVEMENTS_KEY, {});
    all[code] = [...(all[code] || []), { amount, method, registeredAt: new Date().toISOString() }];
    localStorage.setItem(PAYMENT_MOVEMENTS_KEY, JSON.stringify(all));
  }

  // TOTAL RECIBIDO = suma de todos los pagos/abonos validos registrados en el historial de
  // movimientos. Si aun no hay movimientos propios registrados (reservas demo con un monto
  // ya cargado antes de que existiera este historial), se usa el "paid" ya conocido como
  // unico movimiento implicito, sin inventar un desglose que no existe.
  getTotalReceived(code: string): number {
    const movements = this.getPaymentMovements(code);
    if (movements.length > 0) {
      return movements.reduce((sum, movement) => sum + parseCOP(movement.amount), 0);
    }
    return parseCOP(this.getReservation(code)?.paid);
  }

  getReservationModification(code: string): ReservationModification | null {
    return readStorage<Record<string, ReservationModification>>(RESERVATION_MODIFICATIONS_KEY, {})[code] || null;
  }

  // Modificacion de reserva (RF-015A, linea 383): cambia servicio/fecha/viajeros de la
  // MISMA reserva y recalcula valor proyectado, descuento, valor final y saldo. Los pagos
  // ya registrados no se pierden (el saldo se recalcula sobre el pagado existente).
  registerModification(code: string, modification: Omit<ReservationModification, 'registeredAt'>): void {
    const all = readStorage<Record<string, ReservationModification>>(RESERVATION_MODIFICATIONS_KEY, {});
    all[code] = { ...modification, registeredAt: new Date().toISOString() };
    localStorage.setItem(RESERVATION_MODIFICATIONS_KEY, JSON.stringify(all));
  }

  // El estado "Cancelada" de la reserva es independiente de si existe o no valor
  // potencial a devolver: una cancelacion con $0 pagado tambien debe dejar la reserva en
  // "Cancelada", aunque no genere solicitud de devolucion.
  //
  // NO existe en el PDR ninguna formula/tabla parametrizada para calcular el valor a
  // devolver (verificado exhaustivamente): si `hasPotentialRefund` es true, se guarda un
  // refundOrigin con el monto "pendiente de calculo" (nunca un numero inventado).
  registerCancelOrModify(code: string, type: 'Cancelación' | 'Modificación', causal: string, hasPotentialRefund: boolean): RefundOrigin | null {
    const registeredAt = new Date().toISOString();
    if (type === 'Cancelación') {
      const cancellations = readStorage<Record<string, ReservationCancellation>>(RESERVATION_CANCELLATIONS_KEY, {});
      cancellations[code] = { causal, registeredAt };
      localStorage.setItem(RESERVATION_CANCELLATIONS_KEY, JSON.stringify(cancellations));
    }

    if (!hasPotentialRefund) return null;
    const origin: RefundOrigin = {
      type,
      causal,
      potentialAmount: REFUND_PENDING_CALCULATION_LABEL,
      pendingCalculation: true,
      registeredAt,
    };
    const all = readStorage<Record<string, RefundOrigin>>(REFUND_ORIGINS_KEY, {});
    all[code] = origin;
    localStorage.setItem(REFUND_ORIGINS_KEY, JSON.stringify(all));
    return origin;
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
