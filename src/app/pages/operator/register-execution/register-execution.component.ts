import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OperatorReservation } from '../operator-reservation.service';
import { OperatorOperationService } from '../operator-operation.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-register-execution',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './register-execution.component.html',
  styleUrl: './register-execution.component.css',
})
export class RegisterExecutionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly operationService = inject(OperatorOperationService);
  private readonly roleService = inject(OperatorRoleService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  readonly reservation: OperatorReservation | undefined = this.operationService.resolveForOperation(this.code);

  // Regla 5: no se permite iniciar ejecucion mientras la reserva no cumpla la condicion
  // de pago vigente (Confirmada).
  readonly disabled = signal(
    !this.reservation ||
      this.reservation.statusClass !== 'is-confirmed' ||
      !!this.operationService.getExecution(this.code),
  );

  feedback = signal(this.buildInitialFeedback());
  feedbackValid = signal(false);

  served = signal<'' | 'si' | 'no'>('');
  executed = signal(this.reservation?.travelers ?? 0);
  causal = signal('');

  private buildInitialFeedback(): string {
    if (!this.reservation) {
      return 'No se encontró la reserva seleccionada. Vuelve a Operación e ingresa nuevamente por Registrar ejecución.';
    }
    if (this.reservation.statusClass !== 'is-confirmed') {
      return `Esta reserva está en estado "${this.reservation.status}" y no cumple la condición de pago vigente para iniciar ejecución.`;
    }
    if (this.operationService.getExecution(this.code)) {
      return 'Esta reserva ya tiene una ejecución registrada. Consúltala en Ejecuciones registradas.';
    }
    return 'Registra el resultado real de la ejecución.';
  }

  onServedChange(value: string): void {
    this.served.set(value as '' | 'si' | 'no');
  }

  register(): void {
    if (this.disabled() || !this.reservation) return;
    const served = this.served();
    if (!served) {
      this.feedback.set('Selecciona si el servicio se prestó o no.');
      this.feedbackValid.set(false);
      return;
    }
    if (served === 'no' && !this.causal().trim()) {
      this.feedback.set('Registra la causal obligatoria de no prestación del servicio.');
      this.feedbackValid.set(false);
      return;
    }
    const result = this.operationService.registerExecution(
      this.code,
      served === 'si',
      this.executed(),
      this.causal().trim(),
      this.roleService.roleLabel(),
    );
    if (!result) {
      this.feedback.set('No fue posible registrar la ejecución. Vuelve a Operación e intenta nuevamente.');
      this.feedbackValid.set(false);
      return;
    }
    this.feedback.set('Ejecución registrada correctamente. La reserva inicia en estado "En ejecución".');
    this.feedbackValid.set(true);
    this.disabled.set(true);
    window.setTimeout(() => this.router.navigateByUrl('/operator/operations'), 1400);
  }
}
