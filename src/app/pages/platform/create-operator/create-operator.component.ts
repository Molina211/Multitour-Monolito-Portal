import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PLATFORM_OPERATORS_MODULE, PlatformDataService } from '../platform-data.service';

function getPasswordPolicyError(password: string): string {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialCharacter = /[^A-Za-z0-9\s]/.test(password);

  if (hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialCharacter) return '';
  return 'La contrasena debe tener minimo 8 caracteres, una mayuscula, una minuscula, un numero y un caracter especial.';
}

function formatPlatformDate(date: Date): string {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatPlatformDateTime(date: Date): string {
  return `${formatPlatformDate(date)}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-platform-create-operator',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './create-operator.component.html',
  styleUrl: './create-operator.component.css',
})
export class CreateOperatorComponent {
  passwordVisible = signal(false);
  confirmVisible = signal(false);
  feedback = signal('');
  feedbackIsError = signal(false);

  constructor(
    private readonly platformData: PlatformDataService,
    private readonly router: Router,
  ) {}

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
    const name = String(data.get('commercialName') || '').trim();
    const tenantId = String(data.get('tenantId') || '').trim().toLowerCase();
    const status = String(data.get('status') || 'Activo') as 'Activo' | 'Inactivo';
    const adminName = String(data.get('adminName') || '').trim();
    const adminEmail = String(data.get('adminEmail') || '').trim();
    const initialPassword = String(data.get('initialPassword') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');

    if (!name || !tenantId || !adminName || !adminEmail || !initialPassword || !confirmPassword) {
      this.setFeedback('Completa todos los datos del operador y de su primer Administrador.', true);
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
    if (this.platformData.tenants().some((tenant) => tenant.id === tenantId)) {
      this.setFeedback('El identificador ya pertenece a otro operador.', true);
      return;
    }

    const now = new Date();
    this.platformData.createTenant({ id: tenantId, name, status, adminName, adminEmail, createdAt: formatPlatformDate(now) });
    this.platformData.addAuditEvent({
      date: formatPlatformDateTime(now),
      action: 'Operador creado',
      tenant: name,
      tenantId,
      detail: `Estado inicial: ${status}`,
      actorName: 'Fernanda Robayo',
      actorRole: 'Administrador de plataforma',
      reason: 'Alta administrativa inicial',
      recordAffected: `Operador: ${tenantId}`,
      previousValue: 'No aplica',
      newValue: `Estado inicial: ${status}`,
      module: PLATFORM_OPERATORS_MODULE,
      functionalReference: 'Alta administrativa de operador',
    });
    this.setFeedback('Operador creado en esta simulacion.', false);
    window.setTimeout(() => this.router.navigateByUrl('/platform/operators'), 700);
  }

  private setFeedback(message: string, isError: boolean): void {
    this.feedback.set(message);
    this.feedbackIsError.set(isError);
  }
}
