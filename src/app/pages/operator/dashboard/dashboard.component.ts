import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorRoleService } from '../operator-role.service';
import { OperatorReportsService } from '../operator-reports.service';
import { OperatorCashService } from '../operator-cash.service';
import { OperatorReservationService } from '../operator-reservation.service';
import { formatCOP } from '../../../core/money.util';

@Component({
  selector: 'app-operator-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  readonly roleService = inject(OperatorRoleService);
  private readonly reportsService = inject(OperatorReportsService);
  private readonly cashService = inject(OperatorCashService);
  private readonly reservationService = inject(OperatorReservationService);

  dashboard = computed(() => this.reportsService.getDashboard());

  pendingSupportCount = computed(() => this.reservationService.reservations().filter((r) => r.payment === 'En validación').length);

  // Regla (PDR linea 114/554): el titulo de la tarjeta de pagos refleja si el tenant
  // habilito al Colaborador para validar soportes; nunca habilita la accion sin permiso.
  pagosLabel = computed(() =>
    this.roleService.collaboratorCanValidateSupport() ? 'Pagos y soportes por validar' : 'Pagos pendientes de seguimiento',
  );

  // Mismo total ya mostrado en Caja (misma jornada real): BASE + INGRESOS - PAGOS
  // OPERACIONALES - GASTOS (ver BLOQUEO en operator-cash.service.ts: sin devoluciones por
  // jornada real todavia).
  cajaTotalLabel = computed(() => {
    const day = this.cashService.current();
    return day ? formatCOP(day.totalAmount) : 'Sin jornada abierta hoy';
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.reservationService.refresh(), this.cashService.refreshToday()]);
  }
}
