import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CURRENT_TENANT_ID } from '../../core/tenant.constants';
import { LoginUseCase } from '../../core/auth/application/login.use-case';
import { SessionService } from '../../core/session.service';
import { ADMINISTRATOR_ROLE, OPERATIONAL_COLLABORATOR_ROLE, homeRouteForRole } from '../../core/membership-role';
import { OperatorRole, OperatorRoleService } from '../operator/operator-role.service';

type LoginRole = 'client' | 'staff';

// La pestana Cliente/Equipo del operador (y su sub-pestana Administrador/Colaborador) es
// SOLO una ayuda visual para el copy de la pantalla: el rol real siempre lo decide el
// Backend en la respuesta de POST /api/tenants/{tenantId}/login (campo "role"), nunca lo
// que el usuario haya presionado aqui. Si alguien entra por la pestana equivocada, igual
// se le redirige segun su rol real, no segun la pestana.
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
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly sessionService = inject(SessionService);

  role = signal<LoginRole>('client');
  staffRole = signal<OperatorRole>('admin');
  passwordVisible = signal(false);
  feedback = signal('');
  feedbackIsError = signal(false);
  submitting = signal(false);

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
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');

    if (!email || !password) {
      this.setFeedback('Ingresa tu correo y tu contrasena.', true);
      return;
    }

    this.submitting.set(true);
    this.setFeedback('Validando credenciales...', false);

    this.loginUseCase.execute(CURRENT_TENANT_ID, email, password).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.sessionService.setSession(response);
        if (response.role === ADMINISTRATOR_ROLE) {
          this.operatorRoleService.setRole('admin');
        } else if (response.role === OPERATIONAL_COLLABORATOR_ROLE) {
          this.operatorRoleService.setRole('colaborador');
        }
        this.router.navigateByUrl(homeRouteForRole(response.role));
      },
      error: (error: Error) => {
        this.submitting.set(false);
        this.setFeedback(error.message, true);
      },
    });
  }

  private setFeedback(message: string, isError: boolean): void {
    this.feedback.set(message);
    this.feedbackIsError.set(isError);
  }
}
