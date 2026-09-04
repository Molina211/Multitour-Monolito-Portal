import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorRefundService, RefundRequest } from '../operator-refund.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-refund-requests',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './refund-requests.component.html',
  styleUrl: './refund-requests.component.css',
})
export class RefundRequestsComponent {
  private readonly refundService = inject(OperatorRefundService);
  private readonly roleService = inject(OperatorRoleService);

  requests = this.refundService.requests;
  hasRequests = computed(() => this.requests().length > 0);

  // Regla (PDR linea 566): autorizar/rechazar es exclusivo del Administrador. El Colaborador
  // operativo nunca ve una etiqueta que sugiera que puede decidir; para el mismo estado solo
  // puede consultar (el detalle ya oculta el panel de decision para su rol).
  actionLabel(request: RefundRequest): string {
    if (request.pendingCalculation) return 'Consultar detalle';
    if (request.status === 'Pendiente de autorización') {
      return this.roleService.isAdmin() ? 'Autorizar devolución' : 'Consultar detalle';
    }
    if (request.status === 'Autorizada') return 'Registrar ejecución';
    return 'Consultar detalle';
  }
}
