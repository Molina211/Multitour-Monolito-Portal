import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type RecoverStep = 'identify' | 'reset';

@Component({
  selector: 'app-recover',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './recover.component.html',
  styleUrl: './recover.component.css',
})
export class RecoverComponent {
  step = signal<RecoverStep>('identify');
  email = signal('');
  passwordVisible = signal(false);
  confirmVisible = signal(false);
  feedback = signal('');

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  toggleConfirmVisibility(): void {
    this.confirmVisible.set(!this.confirmVisible());
  }

  onEmailInput(value: string): void {
    this.email.set(value);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.step() === 'identify') {
      this.feedback.set('');
      this.step.set('reset');
      return;
    }
    this.feedback.set('Vista de referencia: la recuperacion real de contrasena aun no esta implementada.');
  }
}
