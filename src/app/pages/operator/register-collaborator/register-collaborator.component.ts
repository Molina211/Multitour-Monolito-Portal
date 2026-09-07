import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CollaboratorApiService } from '../../../core/collaborator-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../../core/http-error.util';
import { SessionService } from '../../../core/session.service';
import { getPasswordPolicyError } from '../../../core/password-policy';

@Component({
  selector: 'app-operator-register-collaborator',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './register-collaborator.component.html',
  styleUrl: './register-collaborator.component.css',
})
export class RegisterCollaboratorComponent {
  private readonly collaboratorApi = inject(CollaboratorApiService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  // Rol fijo real (MembershipRole.OPERATIONAL_COLLABORATOR): este endpoint no permite
  // elegir otro rol ni otro tenant (siempre registra dentro del tenant de la sesión activa).
  readonly fixedRole = 'Colaborador operativo';
  readonly tenantName = this.sessionService.tenantId() || '';

  passwordVisible = signal(false);
  confirmVisible = signal(false);
  feedback = signal('');
  feedbackIsError = signal(false);
  submitting = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  toggleConfirmVisibility(): void {
    this.confirmVisible.set(!this.confirmVisible());
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const tenantId = this.sessionService.tenantId();
    const actorId = this.sessionService.session()?.membershipId;
    if (!tenantId || !actorId) {
      this.setFeedback('No hay una sesión activa.', true);
      return;
    }

    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const initialPassword = String(data.get('initialPassword') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');

    if (!name || !email || !initialPassword || !confirmPassword) {
      this.setFeedback('Completa el nombre, el correo y la contraseña del colaborador.', true);
      return;
    }
    const passwordPolicyError = getPasswordPolicyError(initialPassword);
    if (passwordPolicyError) {
      this.setFeedback(passwordPolicyError, true);
      return;
    }
    if (initialPassword !== confirmPassword) {
      this.setFeedback('La contraseña inicial y su confirmación deben coincidir.', true);
      return;
    }

    this.submitting.set(true);
    this.setFeedback('Registrando...', false);
    this.collaboratorApi
      .register(tenantId, {
        name,
        email,
        password: initialPassword,
        passwordConfirmation: confirmPassword,
        actorId,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.setFeedback('Colaborador registrado correctamente.', false);
          window.setTimeout(() => this.router.navigateByUrl('/operator/collaborators'), 700);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.setFeedback(this.mapError(err), true);
        },
      });
  }

  private mapError(error: HttpErrorResponse): string {
    if (error.status === 409) return 'Ya existe un colaborador registrado con ese correo.';
    if (error.status === 400) return error.error?.message || 'Revisa los datos ingresados.';
    if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
    return 'No fue posible registrar el colaborador.';
  }

  private setFeedback(message: string, isError: boolean): void {
    this.feedback.set(message);
    this.feedbackIsError.set(isError);
  }
}
