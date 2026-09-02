import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css',
})
export class AdminLoginComponent {
  passwordVisible = signal(false);
  feedback = signal('');

  constructor(private readonly router: Router) {}

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.feedback.set('Vista de referencia: sin autenticacion real todavia. Ingresando al panel de plataforma...');
    window.setTimeout(() => this.router.navigateByUrl('/platform'), 500);
  }
}
