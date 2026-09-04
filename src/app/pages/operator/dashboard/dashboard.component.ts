import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorRoleService } from '../operator-role.service';
import { OperatorReportsService } from '../operator-reports.service';
import { OperatorCashService } from '../operator-cash.service';
import { OperatorReservationService } from '../operator-reservation.service';

function formatCOP(value: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(value))}`;
}

const RESOLVED_SUPPORT_STATUSES = ['Pagado', 'Parcial', 'Rechazado'];

@Component({
  selector: 'app-operator-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  readonly roleService = inject(OperatorRoleService);
  private readonly reportsService = inject(OperatorReportsService);
  private readonly cashService = inject(OperatorCashService);
  private readonly reservationService = inject(OperatorReservationService);

  // Resumen del Colaborador del operador: reutiliza EXACTAMENTE los mismos
  // servicios/datos ya construidos para Reportes y Caja, sin inventar una fuente nueva.
  // El Resumen del Administrador (numeros de referencia y bloque "Flujos principales")
  // queda intacto en la plantilla; estos computed solo alimentan la vista de Colaborador.
  dashboard = computed(() => this.reportsService.getDashboard());

  pendingSupportCount = computed(
    () => this.reservationService.getPendingSupportRecords().filter((record) => !RESOLVED_SUPPORT_STATUSES.includes(record.status)).length,
  );

  // Regla (PDR linea 114/554): el titulo de la tarjeta de pagos refleja si el tenant
  // habilito al Colaborador para validar soportes; nunca habilita la accion sin permiso.
  pagosLabel = computed(() =>
    this.roleService.collaboratorCanValidateSupport() ? 'Pagos y soportes por validar' : 'Pagos pendientes de seguimiento',
  );

  // Mismo total ya mostrado en Caja (misma jornada, mismos movimientos): BASE + INGRESOS -
  // PAGOS OPERACIONALES - GASTOS - DEVOLUCIONES.
  cajaTotalLabel = computed(() => {
    const day = this.cashService.getDay();
    return formatCOP(this.cashService.computeTotals(day).total);
  });
}
