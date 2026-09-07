import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// BLOQUEADO POR BACKEND (Fase 12): POST /api/tenants/{tenantId}/reservations exige JWT y
// toma el customerId SIEMPRE del propio token (JwtPrincipal.membershipId(), ver comentario
// en ReservationController.java, spec 007) - no existe forma de que un Administrador o
// Colaborador cree una reserva "a nombre de" otro cliente. No se inventa ese flujo: la
// creacion de reservas es exclusiva del propio Cliente autenticado (Portal Cliente,
// client-tour-booking.component.ts). Esta pantalla se conserva solo para explicar el
// bloqueo, sin formulario funcional.
@Component({
  selector: 'app-operator-create-reservation',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './create-reservation.component.html',
  styleUrl: './create-reservation.component.css',
})
export class CreateReservationComponent {}
