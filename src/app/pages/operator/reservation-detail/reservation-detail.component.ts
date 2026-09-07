import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorReservation, OperatorReservationService } from '../operator-reservation.service';

@Component({
  selector: 'app-operator-reservation-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './reservation-detail.component.html',
  styleUrl: './reservation-detail.component.css',
})
export class ReservationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationService = inject(OperatorReservationService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  loading = this.reservationService.loading;
  reservation = signal<OperatorReservation | undefined>(undefined);

  canCancelOrModify = computed(() => {
    const r = this.reservation();
    return r ? this.reservationService.isEligibleForCancelOrModify(r.statusClass) : false;
  });

  cancellationReason = computed(() => this.reservationService.findRaw(this.code)?.cancellationReason || null);
  cancelledAt = computed(() => this.reservationService.findRaw(this.code)?.cancelledAt || null);
  showCancellationHistory = computed(() => Boolean(this.cancellationReason()) && !this.reservation()?.refundOrigin);

  isSettled = computed(() => {
    const r = this.reservation();
    return Boolean(r && (r.statusClass === 'is-cancelled' || (r.payment === 'Pagado' && r.balance === '$0')));
  });

  async ngOnInit(): Promise<void> {
    await this.reservationService.refresh();
    this.reservation.set(this.reservationService.getReservation(this.code));
  }
}
