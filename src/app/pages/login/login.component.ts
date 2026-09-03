import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OperatorRole, OperatorRoleService } from '../operator/operator-role.service';

type LoginRole = 'client' | 'staff';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly operatorRoleService = inject(OperatorRoleService);

  role = signal<LoginRole>('client');
  // Roles base del PDR dentro del equipo del operador (seccion 14): Administrador y
  // Colaborador operativo. No se inventa un rol nuevo.
  staffRole = signal<OperatorRole>('admin');
  passwordVisible = signal(false);
  feedback = signal('');

  selectRole(role: LoginRole): void {
    this.role.set(role);
  }

  selectStaffRole(staffRole: OperatorRole): void {
    this.staffRole.set(staffRole);
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.role() === 'staff') {
      this.operatorRoleService.setRole(this.staffRole());
      const label = this.staffRole() === 'colaborador' ? 'colaborador del operador' : 'administrador del operador';
      this.feedback.set(`Vista de referencia: sin autenticacion real todavia. Ingresando como ${label}...`);
      window.setTimeout(() => this.router.navigateByUrl('/operator'), 500);
      return;
    }
    this.feedback.set('Vista de referencia: el inicio de sesion real aun no esta implementado.');
  }
}
