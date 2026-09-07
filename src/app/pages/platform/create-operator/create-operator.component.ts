import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PlatformDataService } from '../platform-data.service';
import { getPasswordPolicyError } from '../../../core/password-policy';

@Component({
  selector: 'app-platform-create-operator',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './create-operator.component.html',
  styleUrl: './create-operator.component.css',
})
export class CreateOperatorComponent {
  private readonly platformData = inject(PlatformDataService);
  private readonly router = inject(Router);

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

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const commercialName = String(data.get('commercialName') || '').trim();
    const tenantId = String(data.get('tenantId') || '').trim().toLowerCase();
    const adminEmail = String(data.get('adminEmail') || '').trim();
    const initialPassword = String(data.get('initialPassword') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');

    if (!commercialName || !tenantId || !adminEmail || !initialPassword || !confirmPassword) {
      this.setFeedback('Completa el nombre comercial, el identificador y los datos del primer Administrador.', true);
      return;
    }
    const passwordPolicyError = getPasswordPolicyError(initialPassword);
    if (passwordPolicyError) {
      this.setFeedback(passwordPolicyError, true);
      return;
    }
    if (initialPassword !== confirmPassword) {
      this.setFeedback('La contrasena inicial y su confirmacion deben coincidir.', true);
      return;
    }

    this.submitting.set(true);
    this.setFeedback('Creando operador...', false);
    const result = await this.platformData.createTenant({
      tenantId,
      commercialName,
      adminEmail,
      initialPassword,
      confirmPassword,
    });
    this.submitting.set(false);

    if (!result.ok) {
      this.setFeedback(result.message, true);
      return;
    }
    this.setFeedback('Operador creado.', false);
    window.setTimeout(() => this.router.navigateByUrl('/platform/operators'), 700);
  }

  private setFeedback(message: string, isError: boolean): void {
    this.feedback.set(message);
    this.feedbackIsError.set(isError);
  }
}
