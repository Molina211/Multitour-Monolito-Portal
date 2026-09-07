import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientProfileService } from '../client-profile.service';
import { ClientReservationService, normalizeClientReservationStatus } from '../client-reservation.service';
import { SessionService } from '../../../core/session.service';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-profile.component.html',
  styleUrl: './client-profile.component.css',
})
export class ClientProfileComponent implements OnInit {
  private readonly profileService = inject(ClientProfileService);
  private readonly reservationService = inject(ClientReservationService);
  private readonly sessionService = inject(SessionService);

  tenantName = computed(() => '[Tu Marca]');

  ngOnInit(): void {
    void this.reservationService.refresh();
  }

  // Datos de la cuenta / Datos personales: SOLO informacion existente. Sin perfil real
  // guardado en este navegador (BACKEND/SESION FALTANTE), cada campo muestra "No
  // registrado" en vez de un dato de ejemplo hardcodeado.
  profile = this.profileService.profile;
  displayName = computed(() => this.profile()?.name || 'No registrado');
  displayEmail = computed(() => this.profile()?.email || 'No registrado');
  displayPhone = computed(() => this.profile()?.phone || 'No registrado');
  initials = computed(() => {
    const parts = this.displayName()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    if (!parts.length || this.displayName() === 'No registrado') return 'FN';
    return parts.map((part) => part[0]?.toUpperCase() || '').join('');
  });

  // Resumen: reservas activas, pagos pendientes y ultima reserva, todas derivadas del
  // MISMO historial/reserva actual ya usado por client-reservations y client-payments.
  // Nunca cantidades hardcodeadas.
  private readonly history = this.reservationService.history;

  activeReservationsCount = computed(
    () =>
      this.history().filter((item) => {
        const status = normalizeClientReservationStatus(item.status);
        return status !== 'Finalizada' && status !== 'Cancelada';
      }).length,
  );

  pendingPaymentsCount = computed(
    () =>
      this.history().filter((item) =>
        item.paymentStatus ? item.paymentStatus !== 'Pagado' : normalizeClientReservationStatus(item.status) === 'Pendiente de pago',
      ).length,
  );

  lastReservationLabel = computed(() => {
    const last = this.reservationService.mostRecent();
    return last ? `${last.experience} (${last.startDate})` : 'No registrado';
  });

  // Editar perfil: solo nombre y telefono (ver ClientProfileService).
  editing = signal(false);
  editName = signal('');
  editPhone = signal('');
  feedback = signal('');
  feedbackIsValid = signal(false);

  startEdit(): void {
    this.editName.set(this.profile()?.name || '');
    this.editPhone.set(this.profile()?.phone || '');
    this.feedback.set('');
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveEdit(): void {
    this.profileService.updateProfile({ name: this.editName().trim(), phone: this.editPhone().trim() });
    this.editing.set(false);
    this.feedback.set('Perfil actualizado en esta simulación.');
    this.feedbackIsValid.set(true);
  }

  // BUG corregido: "Cerrar sesión" solo navegaba a /login sin invalidar la sesión real.
  logout(): void {
    this.sessionService.clear();
  }
}
