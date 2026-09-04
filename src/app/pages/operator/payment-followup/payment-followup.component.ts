import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OperatorReservationService, PaymentFollowupEntry } from '../operator-reservation.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-payment-followup',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './payment-followup.component.html',
  styleUrl: './payment-followup.component.css',
})
export class PaymentFollowupComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly reservationService = inject(OperatorReservationService);
  private readonly roleService = inject(OperatorRoleService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  // BUG corregido: "record" salia SOLO del listado de "Pagos pendientes"; una vez esa
  // reserva queda liquidada (saldo $0, Pagado) deja de aparecer ahi, pero esta pantalla
  // debe seguir permitiendo consultar su historial. La reserva se resuelve directo por su
  // MISMA fuente unica (getReservation), independiente de si sigue "pendiente".
  readonly record = this.reservationService.getPendingSupportRecords().find((item) => item.code === this.code) || null;
  readonly reservation = this.reservationService.getReservation(this.code);
  readonly notFound = !this.reservation;
  readonly deadlineNote = this.reservation ? this.reservationService.getPaymentDeadlineNote(this.code) : '';

  // Regla (CORREGIR): saldo $0 y Pagado = ya no es un pago pendiente; solo se consulta el
  // historial existente, no se admite una nueva nota de seguimiento de "pago pendiente".
  readonly isSettled = Boolean(this.reservation && this.reservation.payment === 'Pagado' && this.reservation.balance === '$0');

  note = signal('');
  history = signal<PaymentFollowupEntry[]>(this.notFound ? [] : this.reservationService.getFollowups(this.code));

  feedback = signal(
    this.notFound
      ? 'No se encontró el pago seleccionado. Vuelve a Pagos e ingresa nuevamente por Registrar seguimiento.'
      : this.isSettled
        ? 'Esta reserva ya está pagada: solo puedes consultar el historial de seguimientos existente.'
        : 'Registra la nota de seguimiento para dejar constancia del contacto con el cliente.',
  );
  feedbackIsValid = signal(false);

  hasHistory = computed(() => this.history().length > 0);

  registerFollowup(): void {
    if (this.notFound || this.isSettled) return;
    const note = this.note().trim();
    if (!note) {
      this.feedback.set('Registra una nota de seguimiento antes de guardar.');
      this.feedbackIsValid.set(false);
      return;
    }
    // BUG corregido: el actor quedaba fijo en "Administrador del operador" sin importar
    // quien ejecuto realmente la accion; ahora usa el rol autenticado real.
    this.reservationService.addFollowup(this.code, note, this.roleService.roleLabel());
    this.history.set(this.reservationService.getFollowups(this.code));
    this.note.set('');
    this.feedback.set('Seguimiento registrado correctamente.');
    this.feedbackIsValid.set(true);
  }
}
