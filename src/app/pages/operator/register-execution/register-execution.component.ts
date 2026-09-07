import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OperatorReservation, OperatorReservationService } from '../operator-reservation.service';
import { OperatorOperationService } from '../operator-operation.service';

@Component({
  selector: 'app-operator-register-execution',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './register-execution.component.html',
  styleUrl: './register-execution.component.css',
})
export class RegisterExecutionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly operationService = inject(OperatorOperationService);
  private readonly reservationService = inject(OperatorReservationService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  loading = signal(true);
  reservation = signal<OperatorReservation | undefined>(undefined);
  disabled = signal(true);

  feedback = signal('Cargando reserva...');
  feedbackValid = signal(false);

  served = signal<'' | 'si' | 'no'>('');
  executed = signal(0);
  causal = signal('');
  submitting = signal(false);

  async ngOnInit(): Promise<void> {
    await this.reservationService.refresh();
    const reservation = this.reservationService.getReservation(this.code);
    this.reservation.set(reservation);
    this.executed.set(reservation?.travelers ?? 0);
    this.disabled.set(!this.operationService.canRegisterExecution(reservation || { statusClass: '' } as OperatorReservation));
    this.loading.set(false);

    if (!reservation) {
      this.feedback.set('No se encontró la reserva seleccionada. Vuelve a Operación e ingresa nuevamente por Registrar ejecución.');
    } else if (reservation.statusClass !== 'is-confirmed') {
      this.feedback.set(`Esta reserva está en estado "${reservation.status}" y no cumple la condición de pago vigente para iniciar ejecución.`);
    } else {
      this.feedback.set('Registra el resultado real de la ejecución.');
    }
  }

  onServedChange(value: string): void {
    this.served.set(value as '' | 'si' | 'no');
  }

  async register(): Promise<void> {
    if (this.disabled() || !this.reservation()) return;
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

    this.submitting.set(true);
    const result = await this.operationService.registerExecution(this.code, served === 'si', this.executed(), this.causal().trim());
    this.submitting.set(false);
    if (!result.ok) {
      this.feedback.set(result.message);
      this.feedbackValid.set(false);
      return;
    }
    this.feedback.set('Ejecución registrada correctamente. La reserva inicia en estado "En ejecución".');
    this.feedbackValid.set(true);
    this.disabled.set(true);
    window.setTimeout(() => this.router.navigateByUrl('/operator/operations'), 1400);
  }
}
