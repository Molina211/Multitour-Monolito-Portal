import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './operator-shell.component.html',
  styleUrl: './operator-shell.component.css',
})
export class OperatorShellComponent {
  readonly roleService = inject(OperatorRoleService);
}
