import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorReservationService } from '../operator-reservation.service';

@Component({
  selector: 'app-operator-reservations',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reservations.component.html',
  styleUrl: './reservations.component.css',
})
export class ReservationsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationService = inject(OperatorReservationService);

  showAll = signal(false);
  additionalDiscountMode = this.route.snapshot.queryParamMap.get('mode') === 'additional-discount';

  loading = this.reservationService.loading;
  error = this.reservationService.error;
  reservations = this.reservationService.reservations;
  archivedClasses = ['is-finalized', 'is-cancelled'];

  ngOnInit(): void {
    void this.reservationService.refresh();
  }

  isArchived(reservation: { statusClass: string }): boolean {
    return this.archivedClasses.includes(reservation.statusClass);
  }

  isEligibleForAdditionalDiscount(reservation: { statusClass: string }): boolean {
    return this.reservationService.isEligibleForAdditionalDiscount(reservation.statusClass);
  }

  toggleScope(): void {
    this.showAll.set(!this.showAll());
  }
}
