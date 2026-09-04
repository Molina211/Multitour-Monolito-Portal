import { Injectable, inject } from '@angular/core';
import { OperatorRefundService } from './operator-refund.service';
import { OperatorReservationService } from './operator-reservation.service';
import { OperatorOperationService } from './operator-operation.service';

export type CashMovementType = 'Ingreso' | 'Pago operacional' | 'Gasto' | 'Devolución';

export interface CashMovement {
  time: string;
  type: CashMovementType;
  concept: string;
  amount: number;
  responsible: string;
}

export interface RefundCashMovement extends CashMovement {
  displayAmount: string;
}

export interface CashDay {
  date: string;
  status: 'abierta' | 'cerrada';
  base: number;
  movements: CashMovement[];
}

// RF-012 (linea 507): reporte administrativo mensual, cerrado con sus 8 campos
// obligatorios. Compartido entre Caja > Consolidación mensual y Reportes para que ambas
// pantallas muestren siempre los mismos periodos y valores, sin duplicar el calculo.
export interface MonthlyConsolidation {
  period: string;
  ingresos: number;
  pagosOperacionales: number;
  gastos: number;
  devoluciones: number;
  total: number;
  cancelaciones: number;
  costosOperacionales: number;
}

export interface CashCorrection {
  justification: string;
  appliedBy: string;
  appliedAt: string;
}

export interface CashClosure {
  id: string;
  date: string;
  base: number;
  ingresos: number;
  pagosOperacionales: number;
  gastos: number;
  devoluciones: number;
  total: number;
  movements: CashMovement[];
  closedAt: string;
  closedBy: string;
  corrections: CashCorrection[];
}

const CASH_DAY_KEY = 'multitour-cash-day';
const CASH_CLOSURES_KEY = 'multitour-cash-closures';
const TENANT_TIMEZONE = 'America/Bogota';

function parseCOP(value: string | undefined): number {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

function formatCOP(value: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(value))}`;
}

function formatSignedCOP(value: number): string {
  return value < 0 ? `-${formatCOP(Math.abs(value))}` : formatCOP(value);
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// La jornada de caja, su cierre, historial y consolidacion deben usar SIEMPRE la fecha/hora
// local del tenant (America/Bogota), nunca UTC ni la zona horaria de quien consulta: de lo
// contrario el cambio de dia por huso horario desfasa la fecha de jornada respecto a la
// fecha/hora de cierre mostrada (ej. encabezado "2026-09-03" vs "Sep 2, 2026").
function getTenantDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TENANT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function formatTenantDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString('es-CO', { timeZone: TENANT_TIMEZONE });
}

function getCashTodayKey(): string {
  return getTenantDateKey();
}

// Mismos 2 movimientos ya aprobados en la landing (admin-caja.html): base $300.000, un
// Ingreso de $1.290.000 y un Gasto de $250.000. Valor de arranque en frio (solo cuando
// nunca existio ninguna jornada): no se reinventa en cada jornada nueva, se hereda de la
// jornada anterior segun PDR linea 769.
function getDefaultCashDay(): CashDay {
  return {
    date: getCashTodayKey(),
    status: 'abierta',
    base: 300000,
    movements: [
      { time: '09:20', type: 'Ingreso', concept: 'Pago reserva #RES-1832', amount: 1290000, responsible: 'Fernanda Robayo' },
      { time: '11:45', type: 'Gasto', concept: 'Compra operativa', amount: -250000, responsible: 'Fernanda Robayo' },
    ],
  };
}

// Ingresos, Pagos operacionales y Gastos se calculan SIEMPRE a partir de los movimientos
// reales registrados en "Registro de la jornada" (nunca como contadores independientes
// que puedan desincronizarse). Cada valor de las tarjetas queda así justificado por los
// movimientos existentes, sin inventar cifras ni movimientos.
function computeMovementTotals(day: CashDay): { ingresos: number; pagosOperacionales: number; gastos: number } {
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

// Caja del Administrador del operador (PDR linea 767): BASE + INGRESOS - PAGOS
// OPERACIONALES - GASTOS - DEVOLUCIONES = TOTAL. Simulacion local (localStorage), mismas
// claves ya usadas en la landing aprobada.
@Injectable({ providedIn: 'root' })
export class OperatorCashService {
  private readonly refundService = inject(OperatorRefundService);
  private readonly reservationService = inject(OperatorReservationService);
  private readonly operationService = inject(OperatorOperationService);

  // Regla PDR: la Caja funciona por jornada. Cada jornada tiene su propia base,
  // movimientos y cierre. Cuando la jornada guardada ya esta cerrada, se ofrece una nueva
  // jornada separada (fecha de hoy, sin movimientos), heredando la base de la jornada
  // anterior -no su total de cierre- salvo que el Administrador registre un nuevo valor
  // (PDR linea 769). Esta nueva jornada solo se persiste cuando el Administrador realiza
  // una accion real (ajustar base o registrar un movimiento); la jornada cerrada anterior
  // ya quedo conservada integramente en el historial de cierres.
  getDay(): CashDay {
    const stored = readStorage<CashDay | null>(CASH_DAY_KEY, null);
    const today = getCashTodayKey();

    // Fuente unica de verdad: la jornada de HOY solo esta cerrada si ya existe un cierre
    // real para la fecha local de hoy en getClosures() (ya normalizada por closedAt). No se
    // confia en el "date"/"status" guardado aparte en la jornada en curso, que pudo quedar
    // desactualizado por el mismo bug de huso horario ya corregido en los cierres (eso
    // provocaba que, al cambiar de dia, la pantalla siguiera mostrando cerrada la jornada
    // del dia anterior en lugar de abrir una jornada nueva para hoy).
    const todaysClosure = this.getClosures().find((closure) => closure.date === today);
    if (todaysClosure) {
      // Las devoluciones del cierre se recalculan siempre en vivo con
      // getExecutedRefundMovements(); se excluyen aqui para no duplicarlas.
      const movements = todaysClosure.movements.filter((movement) => movement.type !== 'Devolución');
      return { date: today, status: 'cerrada', base: todaysClosure.base, movements };
    }

    if (!stored) return getDefaultCashDay();
    // Regla: debe existir un unico cierre ordinario por tenant y fecha. Sin un cierre real
    // para hoy, la jornada de hoy esta abierta. Si lo almacenado pertenece a un dia
    // distinto o quedo marcado "cerrada" por un cierre de un dia anterior, se inicializa una
    // jornada NUEVA para hoy, heredando la base -no el total de cierre- segun PDR linea 769.
    if (stored.date !== today || stored.status === 'cerrada') {
      return { date: today, status: 'abierta', base: stored.base, movements: [] };
    }
    return stored;
  }

  private saveDay(day: CashDay): void {
    localStorage.setItem(CASH_DAY_KEY, JSON.stringify(day));
  }

  // Debe existir un unico cierre ordinario por tenant y fecha, y la fecha del encabezado
  // ("Cierre 2026-09-03") debe corresponder SIEMPRE a la misma fecha/hora local del tenant
  // (America/Bogota) que se muestra en el detalle del cierre. Esta es la UNICA fuente de
  // lectura de cierres (Historial, Consolidacion mensual y el propio cierre la consultan):
  // se corrige la fuente aqui mismo (no solo se filtra en pantalla), en dos pasos:
  // 1) el "date" de cada cierre se recalcula SIEMPRE a partir de su propio "closedAt" (el
  //    instante real, sin ambiguedad de huso horario) convertido a fecha local del tenant,
  //    nunca se confia en un "date" que pudo quedar mal calculado por un bug ya corregido;
  // 2) si tras normalizar la fecha llegaran a coincidir dos cierres, se conserva el
  //    ORDINARIO original (el primero) y se fusiona en el cualquier correccion que hubiera
  //    quedado registrada sobre el duplicado, sin perder trazabilidad ni reemplazar el
  //    responsable historico valido de cada correccion.
  getClosures(): CashClosure[] {
    const stored = readStorage<CashClosure[]>(CASH_CLOSURES_KEY, []);
    const byDate = new Map<string, CashClosure>();
    let changed = false;
    stored.forEach((closure) => {
      const tenantDate = closure.closedAt ? getTenantDateKey(new Date(closure.closedAt)) : closure.date;
      if (tenantDate !== closure.date) changed = true;
      const normalized = tenantDate === closure.date ? closure : { ...closure, date: tenantDate };
      const existing = byDate.get(tenantDate);
      if (!existing) {
        byDate.set(tenantDate, { ...normalized, corrections: [...(normalized.corrections || [])] });
        return;
      }
      changed = true;
      existing.corrections = [...(existing.corrections || []), ...(normalized.corrections || [])];
    });
    const deduped = Array.from(byDate.values());
    if (changed) this.saveClosures(deduped);
    return deduped;
  }

  private saveClosures(closures: CashClosure[]): void {
    localStorage.setItem(CASH_CLOSURES_KEY, JSON.stringify(closures));
  }

  // Solo se suman devoluciones EFECTIVAMENTE ejecutadas (RF-015B/linea 507). El monto
  // real de cada devolucion sigue "pendiente de parametrizacion comercial" (no existe
  // formula parametrizada aun): su aporte numerico es $0 hasta que exista un valor real
  // calculado, sin inventar ningun monto. La reserva relacionada siempre queda visible.
  getExecutedRefundMovements(): RefundCashMovement[] {
    return this.refundService
      .requests()
      .filter((request) => request.status === 'Ejecutada')
      .map((request) => {
        const numericAmount = parseCOP(request.amount);
        const signedAmount = numericAmount > 0 ? -numericAmount : 0;
        return {
          time: request.executedAt ? new Date(request.executedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '--:--',
          type: 'Devolución' as CashMovementType,
          concept: `Devolución reserva #${request.reservationCode}`,
          amount: signedAmount,
          displayAmount: numericAmount > 0 ? formatSignedCOP(signedAmount) : request.amount,
          responsible: request.executedBy || 'Sin responsable asignado',
        };
      });
  }

  computeTotals(
    day: CashDay,
  ): { ingresos: number; pagosOperacionales: number; gastos: number; devoluciones: number; total: number; refundMovements: RefundCashMovement[] } {
    const { ingresos, pagosOperacionales, gastos } = computeMovementTotals(day);
    const refundMovements = this.getExecutedRefundMovements();
    const devoluciones = refundMovements.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const total = day.base + ingresos - pagosOperacionales - gastos - devoluciones;
    return { ingresos, pagosOperacionales, gastos, devoluciones, total, refundMovements };
  }

  // Regla: solo el Administrador del operador puede modificar la base diaria (PDR linea
  // 767/1021). La base es independiente del cierre de la jornada anterior (linea 769):
  // se guarda por jornada y se mantiene hasta que el Administrador registre un nuevo valor.
  adjustBase(value: number): CashDay {
    const day = this.getDay();
    day.base = value;
    this.saveDay(day);
    return day;
  }

  // Todo movimiento distingue Ingreso, Pago operacional, Gasto o Devolución. Las
  // devoluciones no se registran manualmente aqui: se agregan solo cuando quedan
  // efectivamente ejecutadas desde el flujo de Solicitudes de devolución.
  registerMovement(type: 'Ingreso' | 'Pago operacional' | 'Gasto', concept: string, amount: number, actor: string): CashDay {
    const day = this.getDay();
    const time = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const signedAmount = type === 'Ingreso' ? amount : -amount;
    day.movements.push({ time, type, concept, amount: signedAmount, responsible: actor });
    this.saveDay(day);
    return day;
  }

  // Cerrar caja conserva el cierre y el historico de movimientos; nunca borra
  // informacion. El dia queda cerrado hasta una correccion posterior autorizada.
  // Regla 1: debe existir un unico cierre ordinario por tenant y fecha. Si ya existe un
  // cierre normal para esta fecha, no se crea otro duplicado: cualquier ajuste posterior se
  // registra como correccion del mismo cierre desde Historial de caja (regla 8).
  closeDay(actor: string): { day: CashDay; duplicate: boolean } {
    const day = this.getDay();
    if (day.status === 'cerrada') return { day, duplicate: false };
    const dayDate = day.date || getCashTodayKey();
    const closures = this.getClosures();
    if (closures.some((closure) => closure.date === dayDate)) {
      day.status = 'cerrada';
      this.saveDay(day);
      return { day, duplicate: true };
    }
    const { ingresos, pagosOperacionales, gastos, devoluciones, total, refundMovements } = this.computeTotals(day);
    closures.push({
      id: `cierre-${Date.now()}`,
      date: dayDate,
      base: day.base,
      ingresos,
      pagosOperacionales,
      gastos,
      devoluciones,
      total,
      movements: [...day.movements, ...refundMovements],
      closedAt: new Date().toISOString(),
      closedBy: actor,
      corrections: [],
    });
    this.saveClosures(closures);
    day.status = 'cerrada';
    this.saveDay(day);
    return { day, duplicate: false };
  }

  // Toda correccion posterior al cierre queda restringida al Administrador del operador,
  // exige justificacion obligatoria y trazabilidad, y NUNCA sobrescribe los valores
  // originales del cierre (se agrega como historial adicional).
  addCorrection(closureId: string, justification: string, actor: string): CashClosure | null {
    const closures = this.getClosures();
    const closure = closures.find((item) => item.id === closureId);
    if (!closure) return null;
    closure.corrections = closure.corrections || [];
    closure.corrections.push({ justification, appliedBy: actor, appliedAt: new Date().toISOString() });
    this.saveClosures(closures);
    return closure;
  }

  getMonthlyCancellationsCount(period: string): number {
    return this.reservationService.getAllReservationCancellations().filter((c) => c.registeredAt.slice(0, 7) === period).length;
  }

  // RF-012 (linea 507): agrupa los cierres reales por periodo. Compartido por Caja >
  // Consolidación mensual y Reportes, para que ambas pantallas muestren siempre los
  // mismos valores derivados de Caja, Reservas y Operación/Costos.
  getMonthlyConsolidation(): MonthlyConsolidation[] {
    // Regla 3: la consolidacion mensual usa unicamente cierres diarios validos, sin
    // duplicar una misma jornada. getClosures() ya garantiza un unico cierre ordinario por
    // fecha (fuente unica, corregida de raiz), asi que aqui no se vuelve a deduplicar aparte.
    const closures = this.getClosures();
    if (!closures.length) return [];

    const costs = this.operationService.getAllCosts();
    const grouped = new Map<string, Omit<MonthlyConsolidation, 'period' | 'cancelaciones' | 'costosOperacionales'>>();
    closures.forEach((closure) => {
      const period = closure.date.slice(0, 7);
      const current = grouped.get(period) || { ingresos: 0, pagosOperacionales: 0, gastos: 0, devoluciones: 0, total: 0 };
      current.ingresos += closure.ingresos;
      current.pagosOperacionales += closure.pagosOperacionales;
      current.gastos += closure.gastos;
      current.devoluciones += closure.devoluciones;
      current.total += closure.total;
      grouped.set(period, current);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([period, data]) => ({
        period,
        ...data,
        cancelaciones: this.getMonthlyCancellationsCount(period),
        costosOperacionales: costs.filter((c) => c.registeredAt.slice(0, 7) === period).reduce((sum, c) => sum + c.amount, 0),
      }));
  }
}
