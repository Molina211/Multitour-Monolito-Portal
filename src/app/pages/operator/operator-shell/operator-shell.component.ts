import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { OperatorRoleService } from '../operator-role.service';
import { SessionService } from '../../../core/session.service';

@Component({
  selector: 'app-operator-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './operator-shell.component.html',
  styleUrl: './operator-shell.component.css',
})
export class OperatorShellComponent {
  readonly roleService = inject(OperatorRoleService);
  private readonly sessionService = inject(SessionService);

  // BUG corregido: "Cerrar sesión" solo navegaba a /login sin invalidar la sesión real
  // (SessionService.clear()); el JWT seguia vigente en sessionStorage. Unica logica de
  // limpieza real vive en SessionService.clear() (fuente unica); este metodo solo la invoca.
  logout(): void {
    this.sessionService.clear();
  }
}
