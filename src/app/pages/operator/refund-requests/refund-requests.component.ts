import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorRefundService, RefundRequest } from '../operator-refund.service';

@Component({
  selector: 'app-operator-refund-requests',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './refund-requests.component.html',
  styleUrl: './refund-requests.component.css',
})
export class RefundRequestsComponent {
  private readonly refundService = inject(OperatorRefundService);

  requests = this.refundService.requests;
  hasRequests = computed(() => this.requests().length > 0);

  actionLabel(request: RefundRequest): string {
    if (request.pendingCalculation) return 'Consultar detalle';
    if (request.status === 'Pendiente de autorización') return 'Autorizar devolución';
    if (request.status === 'Autorizada') return 'Registrar ejecución';
    return 'Consultar detalle';
  }
}
