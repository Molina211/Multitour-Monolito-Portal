import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorReservationService } from '../operator-reservation.service';
import { OperatorRoleService } from '../operator-role.service';

interface PendingPaymentRow {
  code: string;
  customer: string;
  method: string;
  amount: string;
  status: string;
  action: 'validate' | 'follow-up';
}

// Fuente real: se deriva del mismo listado ya cargado por OperatorReservationService
// (GET .../reservations), filtrando por paymentStatus/method - equivalente a
// GET .../reservations/pending-support pero sin duplicar la carga ni el mapeo de nombres
// de servicio, que ya resuelve ese mismo servicio.
@Component({
  selector: 'app-operator-payments',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.css',
})
export class PaymentsComponent implements OnInit {
  private readonly reservationService = inject(OperatorReservationService);
  readonly roleService = inject(OperatorRoleService);

  loading = this.reservationService.loading;

  pendingRecords = computed<PendingPaymentRow[]>(() => {
    const rows: PendingPaymentRow[] = [];
    for (const r of this.reservationService.reservations()) {
      if (r.payment === 'En validación') {
        rows.push({ code: r.code, customer: r.customer, method: r.method, amount: r.balance, status: r.payment, action: 'validate' });
      } else if (r.method === 'Abono' && r.payment !== 'Pagado' && r.statusClass !== 'is-cancelled') {
        rows.push({ code: r.code, customer: r.customer, method: r.method, amount: r.balance, status: r.payment, action: 'follow-up' });
      }
    }
    return rows;
  });
  pendingCount = computed(() => this.pendingRecords().length);

  // Restriccion base (PDR linea 114/554): el Colaborador operativo solo puede validar o
  // rechazar soportes de transferencia cuando el tenant lo habilite expresamente para ese rol.
  canValidateSupport = computed(() => this.roleService.isAdmin() || this.roleService.collaboratorCanValidateSupport());

  ngOnInit(): void {
    void this.reservationService.refresh();
  }

  isPending(_record: PendingPaymentRow): boolean {
    return true;
  }
}
