import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

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

  role = signal<LoginRole>('client');
  passwordVisible = signal(false);
  feedback = signal('');

  selectRole(role: LoginRole): void {
    this.role.set(role);
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.role() === 'staff') {
      this.feedback.set('Vista de referencia: sin autenticacion real todavia. Ingresando al resumen del operador...');
      window.setTimeout(() => this.router.navigateByUrl('/operator'), 500);
      return;
    }
    this.feedback.set('Vista de referencia: el inicio de sesion real aun no esta implementado.');
  }
}
