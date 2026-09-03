import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorReservationService, PendingSupportRecord } from '../operator-reservation.service';
import { OPERATOR_COLLABORATOR_CAN_VALIDATE_SUPPORT, OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-payments',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.css',
})
export class PaymentsComponent {
  private readonly reservationService = inject(OperatorReservationService);
  private readonly roleService = inject(OperatorRoleService);

  pendingRecords = computed(() => this.reservationService.getPendingSupportRecords());
  pendingCount = computed(() => this.pendingRecords().filter((record) => this.isPending(record)).length);

  // Restriccion base (PDR linea 114/554): el Colaborador operativo solo puede validar o
  // rechazar soportes de transferencia cuando el tenant lo habilite expresamente para ese
  // rol (deshabilitado por defecto en este entorno local).
  canValidateSupport = computed(() => this.roleService.isAdmin() || OPERATOR_COLLABORATOR_CAN_VALIDATE_SUPPORT);

  isPending(record: PendingSupportRecord): boolean {
    return this.reservationService.isPendingSupport(record);
  }
}
