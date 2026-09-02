import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  passwordVisible = signal(false);
  confirmVisible = signal(false);
  feedback = signal('');

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  toggleConfirmVisibility(): void {
    this.confirmVisible.set(!this.confirmVisible());
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.feedback.set('Vista de referencia: el registro real aun no esta implementado.');
  }
}
