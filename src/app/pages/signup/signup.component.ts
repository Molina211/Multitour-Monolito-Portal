import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CustomerApiService } from '../../core/customer-api.service';
import { CURRENT_TENANT_ID } from '../../core/tenant.constants';
import { getPasswordPolicyError } from '../../core/password-policy';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  private readonly customerApi = inject(CustomerApiService);
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

  onSubmit(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const firstName = String(data.get('first_name') || '').trim();
    const lastName = String(data.get('last_name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const password = String(data.get('password') || '');
    const passwordConfirmation = String(data.get('confirm_password') || '');

    if (!firstName || !lastName || !email || !password || !passwordConfirmation) {
      this.setFeedback('Completa nombre, apellido, correo y contrasena.', true);
      return;
    }
    const policyError = getPasswordPolicyError(password);
    if (policyError) {
      this.setFeedback(policyError, true);
      return;
    }
    if (password !== passwordConfirmation) {
      this.setFeedback('La contrasena y su confirmacion deben coincidir.', true);
      return;
    }

    this.submitting.set(true);
    this.setFeedback('Creando tu cuenta...', false);

    this.customerApi
      .register(CURRENT_TENANT_ID, { firstName, lastName, email, phone, password, passwordConfirmation })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.setFeedback('Cuenta creada. Ya puedes iniciar sesion.', false);
          window.setTimeout(() => this.router.navigateByUrl('/login'), 900);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.setFeedback(this.mapRegisterError(error), true);
        },
      });
  }

  private mapRegisterError(error: HttpErrorResponse): string {
    if (error.status === 409) {
      return 'Ya existe una cuenta registrada con ese correo.';
    }
    if (error.status === 400) {
      return error.error?.message || 'Revisa los datos ingresados.';
    }
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Intenta de nuevo.';
    }
    return 'No fue posible crear la cuenta. Intenta de nuevo mas tarde.';
  }

  private setFeedback(message: string, isError: boolean): void {
    this.feedback.set(message);
    this.feedbackIsError.set(isError);
  }
}
