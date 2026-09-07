import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// BLOQUEADO POR BACKEND: ya no es alcanzable desde Crear reserva (ver
// create-reservation.component.ts) - se conserva solo para no romper la ruta existente.
@Component({
  selector: 'app-operator-reservation-created',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reservation-created.component.html',
  styleUrl: './reservation-created.component.css',
})
export class ReservationCreatedComponent {}
