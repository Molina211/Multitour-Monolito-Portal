import { Injectable, inject } from '@angular/core';
import { OPERATOR_TODAY_DATE, OperatorReservationService } from './operator-reservation.service';
import { OperatorOperationService } from './operator-operation.service';
import { OperatorCashService } from './operator-cash.service';

export interface ReportsDashboard {
  createdToday: number;
  pendingPayment: number;
  confirmed: number;
  cancelled: number;
  upcomingExecutions: number;
}

export interface ReportsSummary {
  confirmedSales: number;
  totalIngresos: number;
  totalCosts: number;
  cancelledCount: number;
}

function parseCOP(value: string | undefined): number {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

const CONFIRMED_SALE_STATUS_CLASSES = ['is-confirmed', 'is-execution', 'is-finalized'];

// RF-011/RF-012: Reportes no guarda datos propios, solo deriva y consolida lo ya
// registrado en Reservas, Operación/Costos y Caja, sin inventar cifras independientes.
@Injectable({ providedIn: 'root' })
export class OperatorReportsService {
  private readonly reservationService = inject(OperatorReservationService);
  private readonly operationService = inject(OperatorOperationService);
  private readonly cashService = inject(OperatorCashService);

  // RF-011 (linea 493/1119, CA-011): dashboard diario con reservas creadas del dia,
  // pendientes de pago, confirmadas, canceladas y tours/servicios proximos a ejecutar.
  // Reutiliza los mismos datos ya usados en Reservas y Operación, sin inventar cifras.
  getDashboard(): ReportsDashboard {
    const reservations = this.reservationService.reservationCodesInOrder
      .map((code) => this.operationService.resolveForOperation(code))
      .filter((r): r is NonNullable<typeof r> => !!r);

    // "Creadas hoy" (RF-011): fecha REAL de creacion (createdAt) igual a la fecha de
    // referencia del operador. Los registros base no tienen createdAt (no existe ese dato
    // historico: no se inventa), asi que nunca cuentan como "creadas hoy". Una reserva
    // recien registrada via Crear reserva SI recibe un createdAt real al momento de
    // crearse, y se incorpora a la MISMA lista de reservas para el conteo.
    const draft = this.reservationService.draft();
    const allReservations = draft && draft.createdAt ? [...reservations, draft] : reservations;
    const createdToday = allReservations.filter((r) => r.createdAt === OPERATOR_TODAY_DATE).length;

    // "Canceladas" del dashboard diario (RF-011): unicamente cancelaciones cuya fecha de
    // registro es HOY (no el total historico ni el total del periodo, que corresponden a
    // "Cancelaciones" y "Cancelaciones registradas en el período" respectivamente).
    const cancelledToday = this.reservationService
      .getAllReservationCancellations()
      .filter((c) => c.registeredAt.slice(0, 10) === OPERATOR_TODAY_DATE).length;

    return {
      createdToday,
      pendingPayment: reservations.filter((r) => r.statusClass === 'is-pending').length,
      confirmed: reservations.filter((r) => r.statusClass === 'is-confirmed').length,
      cancelled: cancelledToday,
      upcomingExecutions: this.operationService.getUpcomingExecutions().length,
    };
  }

  // RF-012 (linea 502): ventas confirmadas, ingresos del periodo, costos operacionales y
  // cancelaciones, todos derivados de Reservas, Caja y Operación/Costos reales.
  //
  // "Cancelaciones" y "Cancelaciones registradas en el período" (Reporte mensual) deben
  // salir de la MISMA fuente (el registro de cancelaciones, con fecha real de registro):
  // aqui se cuenta el total del registro sin filtrar por periodo; en el reporte mensual se
  // filtra ese mismo registro por el periodo reportado (OperatorCashService.getMonthlyConsolidation).
  getSummary(): ReportsSummary {
    const reservations = this.reservationService.reservationCodesInOrder
      .map((code) => this.operationService.resolveForOperation(code))
      .filter((r): r is NonNullable<typeof r> => !!r);

    const confirmedSales = reservations
      .filter((r) => CONFIRMED_SALE_STATUS_CLASSES.includes(r.statusClass))
      .reduce((sum, r) => sum + parseCOP(r.final), 0);
    const totalIngresos = this.cashService.getClosures().reduce((sum, c) => sum + c.ingresos, 0);
    const totalCosts = this.operationService.getAllCosts().reduce((sum, c) => sum + c.amount, 0);
    const cancelledCount = this.reservationService.getAllReservationCancellations().length;

    return { confirmedSales, totalIngresos, totalCosts, cancelledCount };
  }
}
