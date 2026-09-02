import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorReservationService } from '../operator-reservation.service';

@Component({
  selector: 'app-operator-payments',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.css',
})
export class PaymentsComponent {
  private readonly reservationService = inject(OperatorReservationService);

  pendingRecords = computed(() => this.reservationService.getPendingSupportRecords());
  pendingCount = computed(() => this.pendingRecords().length);
}
