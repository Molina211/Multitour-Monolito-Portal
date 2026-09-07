import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PLATFORM_TENANT_ID } from '../../core/tenant.constants';
import { LoginUseCase } from '../../core/auth/application/login.use-case';
import { SessionService } from '../../core/session.service';
import { PLATFORM_ADMINISTRATOR_ROLE } from '../../core/membership-role';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css',
})
export class AdminLoginComponent {
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly sessionService = inject(SessionService);

  passwordVisible = signal(false);
  feedback = signal('');
  feedbackIsError = signal(false);
  submitting = signal(false);

  constructor(private readonly router: Router) {}

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

    this.loginUseCase.execute(PLATFORM_TENANT_ID, email, password).subscribe({
      next: (response) => {
        this.submitting.set(false);
        // El Backend (AuthController) no filtra por rol: cualquier membership del tenant
        // "platform" pasaria este login. Hoy el unico rol sembrado ahi es
        // PLATFORM_ADMINISTRATOR (PlatformAdministratorSeeder), pero se valida igual en
        // vez de asumirlo - es una verificacion de UX, no reemplaza la autorizacion real
        // que todavia falta en el Backend (ver auditoria, seccion 8: SecurityConfig
        // permitAll en /api/tenants/*).
        if (response.role !== PLATFORM_ADMINISTRATOR_ROLE) {
          this.setFeedback('Esta cuenta no tiene acceso al panel de plataforma.', true);
          return;
        }
        this.sessionService.setSession(response);
        this.router.navigateByUrl('/platform');
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
