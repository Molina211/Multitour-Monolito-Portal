import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorReservation, OperatorReservationService } from '../operator-reservation.service';

@Component({
  selector: 'app-operator-reservations',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reservations.component.html',
  styleUrl: './reservations.component.css',
})
export class ReservationsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationService = inject(OperatorReservationService);

  showAll = signal(false);
  additionalDiscountMode = this.route.snapshot.queryParamMap.get('mode') === 'additional-discount';

  draft = computed(() => {
    const raw = this.reservationService.draft();
    return raw ? this.reservationService.getReservation(raw.code) ?? null : null;
  });

  reservations = computed(() =>
    this.reservationService.reservationCodesInOrder
      .map((code) => this.reservationService.getReservation(code))
      .filter((reservation): reservation is OperatorReservation => Boolean(reservation)),
  );
  archivedClasses = ['is-finalized', 'is-cancelled'];

  isArchived(reservation: OperatorReservation): boolean {
    return this.archivedClasses.includes(reservation.statusClass);
  }

  isEligibleForAdditionalDiscount(reservation: OperatorReservation): boolean {
    return this.reservationService.isEligibleForAdditionalDiscount(reservation.statusClass);
  }

  toggleScope(): void {
    this.showAll.set(!this.showAll());
  }
}
