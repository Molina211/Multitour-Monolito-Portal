import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from '../../../core/session.service';

@Component({
  selector: 'app-platform-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './platform-shell.component.html',
  styleUrl: './platform-shell.component.css',
})
export class PlatformShellComponent {
  private readonly sessionService = inject(SessionService);

  // BUG corregido: "Cerrar sesión" solo navegaba a /login sin invalidar la sesión real.
  logout(): void {
    this.sessionService.clear();
  }
}
