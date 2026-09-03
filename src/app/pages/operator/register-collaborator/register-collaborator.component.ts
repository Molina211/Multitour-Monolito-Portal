import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  COLLABORATOR_ROLE,
  OPERATOR_CURRENT_TENANT_NAME,
  OperatorCollaboratorService,
  getPasswordPolicyError,
} from '../operator-collaborator.service';

@Component({
  selector: 'app-operator-register-collaborator',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './register-collaborator.component.html',
  styleUrl: './register-collaborator.component.css',
})
export class RegisterCollaboratorComponent {
  private readonly collaboratorService = inject(OperatorCollaboratorService);
  private readonly router = inject(Router);

  readonly fixedRole = COLLABORATOR_ROLE;
  readonly tenantName = OPERATOR_CURRENT_TENANT_NAME;

  passwordVisible = signal(false);
  confirmVisible = signal(false);
  feedback = signal('');
  feedbackIsError = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  toggleConfirmVisibility(): void {
    this.confirmVisible.set(!this.confirmVisible());
  }

  // PDR linea 129: nombre completo, correo electronico, contrasena inicial y confirmacion
  // (mismo mecanismo ya usado para el primer Administrador de un tenant). El rol queda fijo
  // en "Colaborador operativo" y el tenant se asocia automaticamente al operador activo:
  // no se permite elegir Administrador, roles personalizados ni otro tenant.
  onSubmit(event: Event): void {
    event.preventDefault();
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

    this.collaboratorService.register(name, email);
    this.setFeedback('Colaborador registrado correctamente.', false);
    window.setTimeout(() => this.router.navigateByUrl('/operator/collaborators'), 700);
  }

  private setFeedback(message: string, isError: boolean): void {
    this.feedback.set(message);
    this.feedbackIsError.set(isError);
  }
}
