import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorReservation, OperatorReservationService } from '../operator-reservation.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-refund-requests',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './refund-requests.component.html',
  styleUrl: './refund-requests.component.css',
})
export class RefundRequestsComponent implements OnInit {
  private readonly reservationService = inject(OperatorReservationService);
  private readonly roleService = inject(OperatorRoleService);

  loading = this.reservationService.loading;
  requests = computed(() => this.reservationService.reservations().filter((r) => r.refundOrigin));

  ngOnInit(): void {
    void this.reservationService.refresh();
  }

  // Regla (PDR linea 566): autorizar/rechazar es exclusivo del Administrador.
  actionLabel(request: OperatorReservation): string {
    const status = request.refundOrigin?.status;
    if (status === 'Pendiente de autorizacion') {
      return this.roleService.isAdmin() ? 'Autorizar devolución' : 'Consultar detalle';
    }
    if (status === 'Autorizada') return 'Registrar ejecución';
    return 'Consultar detalle';
  }
}
