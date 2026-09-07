import { Injectable, inject } from '@angular/core';
import { parseCOPToNumber } from '../../core/money.util';
import { OperatorReservationService } from './operator-reservation.service';
import { OperatorOperationService } from './operator-operation.service';

export interface ReportsDashboard {
  createdToday: number;
  pendingPayment: number;
  confirmed: number;
  cancelled: number;
  upcomingExecutions: number;
}

export interface ReportsSummary {
  confirmedSales: number;
  cancelledCount: number;
}

const parseCOP = parseCOPToNumber;

const CONFIRMED_SALE_STATUS_CLASSES = ['is-confirmed', 'is-execution', 'is-finalized'];

function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// BLOQUEADO POR BACKEND (parcial): RF-011/RF-012 no tienen un endpoint de "dashboard" o
// "reportes" dedicado. Lo que SI es real: todo lo que se puede derivar de datos ya
// obtenidos de APIs reales (reservas via ReservationController, ejecucion via
// OperationController). Lo que sigue sin API real (ingresos/costos totales del periodo,
// consolidado de caja) se muestra por separado desde Caja > Consolidación mensual
// (GET /cash/consolidation), que si es un endpoint real - no se duplica aqui.
@Injectable({ providedIn: 'root' })
export class OperatorReportsService {
  private readonly reservationService = inject(OperatorReservationService);
  private readonly operationService = inject(OperatorOperationService);

  getDashboard(): ReportsDashboard {
    const reservations = this.reservationService.reservations();
    const today = todayKey();
    const createdToday = reservations.filter((r) => r.createdAt?.slice(0, 10) === today).length;
    const cancelledToday = reservations.filter((r) => r.cancelledAt?.slice(0, 10) === today).length;

    return {
      createdToday,
      pendingPayment: reservations.filter((r) => r.statusClass === 'is-pending').length,
      confirmed: reservations.filter((r) => r.statusClass === 'is-confirmed').length,
      cancelled: cancelledToday,
      upcomingExecutions: this.operationService.getUpcomingExecutions().length,
    };
  }

  getSummary(): ReportsSummary {
    const reservations = this.reservationService.reservations();
    const confirmedSales = reservations
      .filter((r) => CONFIRMED_SALE_STATUS_CLASSES.includes(r.statusClass))
      .reduce((sum, r) => sum + parseCOP(r.final), 0);
    const cancelledCount = reservations.filter((r) => r.statusClass === 'is-cancelled').length;

    return { confirmedSales, cancelledCount };
  }
}
