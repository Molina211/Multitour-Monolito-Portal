import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorOperationService, RegisteredExecution, UpcomingExecution } from '../operator-operation.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-operation',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './operation.component.html',
  styleUrl: './operation.component.css',
})
export class OperationComponent {
  private readonly operationService = inject(OperatorOperationService);
  private readonly roleService = inject(OperatorRoleService);
  private readonly refresh = signal(0);

  upcoming = computed<UpcomingExecution[]>(() => {
    this.refresh();
    return this.operationService.getUpcomingExecutions();
  });
  upcomingCountLabel = computed(() => {
    const count = this.upcoming().length;
    return `${count} próxima${count === 1 ? '' : 's'}`;
  });

  registered = computed<RegisteredExecution[]>(() => {
    this.refresh();
    return this.operationService.getRegisteredExecutions();
  });
  hasRegistered = computed(() => this.registered().length > 0);

  // Regla 5: mientras la reserva no cumpla la condicion de pago vigente (Confirmada), no
  // se permite iniciar ejecucion; se mantiene "Ver pagos".
  canExecute(reservation: UpcomingExecution): boolean {
    return reservation.statusClass === 'is-confirmed';
  }

  executedLabel(execution: RegisteredExecution['execution']): string {
    return execution.served ? `${execution.executed} viajeros` : 'No prestado';
  }

  costPanelOpen = signal(false);
  costFeedback = signal('Selecciona una ejecución registrada para asociar el costo.');
  costFeedbackValid = signal(false);

  // Regla 3 (RF-009, precondicion "Ejecucion iniciada"): mientras no exista ninguna
  // ejecucion registrada, "Registrar costo" permanece deshabilitado.
  openCostPanel(): void {
    if (!this.hasRegistered()) return;
    this.costFeedback.set('Selecciona una ejecución registrada para asociar el costo.');
    this.costFeedbackValid.set(false);
    this.costPanelOpen.set(true);
  }

  cancelCostPanel(): void {
    this.costPanelOpen.set(false);
  }

  // Regla 3 (RF-009, precondicion "Ejecucion iniciada"): "Registrar costo" solo se
  // habilita sobre una ejecucion real ya registrada; nunca un costo generico sin
  // operacion relacionada.
  onCostSubmit(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const reservationCode = String(data.get('execution') || '');
    const concept = String(data.get('concept') || '').trim();
    const amount = Number(data.get('amount'));

    if (!reservationCode) {
      this.costFeedback.set('Selecciona una ejecución real ya registrada para asociar el costo.');
      this.costFeedbackValid.set(false);
      return;
    }
    if (!concept || !amount || amount <= 0) {
      this.costFeedback.set('Completa el concepto y un valor mayor a $0 para registrar el costo.');
      this.costFeedbackValid.set(false);
      return;
    }
    const cost = this.operationService.registerCost(reservationCode, concept, amount, this.roleService.roleLabel());
    if (!cost) {
      this.costFeedback.set('Selecciona una ejecución real ya registrada para asociar el costo.');
      this.costFeedbackValid.set(false);
      return;
    }
    form.reset();
    this.costFeedback.set(`Costo registrado y asociado a la ejecución de la reserva #${reservationCode}.`);
    this.costFeedbackValid.set(true);
    this.costPanelOpen.set(false);
    this.refresh.update((n) => n + 1);
  }
}
