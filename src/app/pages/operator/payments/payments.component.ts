import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorReservationService, PendingSupportRecord } from '../operator-reservation.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-payments',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.css',
})
export class PaymentsComponent {
  private readonly reservationService = inject(OperatorReservationService);
  readonly roleService = inject(OperatorRoleService);

  pendingRecords = computed(() => this.reservationService.getPendingSupportRecords());
  pendingCount = computed(() => this.pendingRecords().filter((record) => this.isPending(record)).length);

  // Restriccion base (PDR linea 114/554): el Colaborador operativo solo puede validar o
  // rechazar soportes de transferencia cuando el tenant lo habilite expresamente para ese
  // rol (deshabilitado por defecto en este entorno local).
  canValidateSupport = computed(() => this.roleService.isAdmin() || this.roleService.collaboratorCanValidateSupport());

  // BUG corregido: para seguimiento (Abono), getPendingSupportRecords() ya filtra las
  // reservas liquidadas (saldo $0, Pagado); toda fila de seguimiento que llega aqui es, por
  // definicion, un pago real todavia pendiente, sin depender del texto de "status" (que
  // puede coincidir por casualidad con un estado "resuelto" generico como "Parcial").
  isPending(record: PendingSupportRecord): boolean {
    if (record.action === 'follow-up') return true;
    return this.reservationService.isPendingSupport(record);
  }
}
