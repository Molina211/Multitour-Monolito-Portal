import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorOperationService, RegisteredExecution } from '../operator-operation.service';
import { OperatorReservation, OperatorReservationService } from '../operator-reservation.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-operation',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './operation.component.html',
  styleUrl: './operation.component.css',
})
export class OperationComponent implements OnInit {
  private readonly operationService = inject(OperatorOperationService);
  private readonly reservationService = inject(OperatorReservationService);
  private readonly roleService = inject(OperatorRoleService);

  loading = signal(true);
  upcoming = signal<OperatorReservation[]>([]);
  registered = signal<RegisteredExecution[]>([]);

  upcomingCountLabel = computed(() => {
    const count = this.upcoming().length;
    return `${count} próxima${count === 1 ? '' : 's'}`;
  });
  hasRegistered = computed(() => this.registered().length > 0);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    await this.reservationService.refresh();
    this.upcoming.set(this.operationService.getUpcomingExecutions());
    this.registered.set(await this.operationService.getRegisteredExecutions());
    this.loading.set(false);
  }

  canExecute(reservation: OperatorReservation): boolean {
    return reservation.statusClass === 'is-confirmed';
  }

  executedLabel(execution: RegisteredExecution['execution']): string {
    return execution.served ? `${execution.executed} viajeros` : 'No prestado';
  }

  finalizeFeedback = signal('');
  finalizing = signal(false);

  canFinalize(execution: RegisteredExecution['execution']): boolean {
    return !execution.finalized;
  }

  async finalize(code: string): Promise<void> {
    this.finalizing.set(true);
    const result = await this.operationService.finalizeExecution(code);
    this.finalizing.set(false);
    this.finalizeFeedback.set(
      result.ok
        ? `Ejecución de la reserva #${code} finalizada. Ya no aparece como en ejecución activa.`
        : `No fue posible finalizar la ejecución de la reserva #${code}: ${result.ok ? '' : result.message}`,
    );
    await this.load();
  }

  costPanelOpen = signal(false);
  costFeedback = signal('Selecciona una ejecución registrada para asociar el costo.');
  costFeedbackValid = signal(false);
  costSubmitting = signal(false);

  openCostPanel(): void {
    if (!this.hasRegistered()) return;
    this.costFeedback.set('Selecciona una ejecución registrada para asociar el costo.');
    this.costFeedbackValid.set(false);
    this.costPanelOpen.set(true);
  }

  cancelCostPanel(): void {
    this.costPanelOpen.set(false);
  }

  async onCostSubmit(event: Event): Promise<void> {
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

    this.costSubmitting.set(true);
    const result = await this.operationService.registerCost(reservationCode, concept, amount);
    this.costSubmitting.set(false);
    if (!result.ok) {
      this.costFeedback.set(result.message);
      this.costFeedbackValid.set(false);
      return;
    }
    form.reset();
    this.costFeedback.set(`Costo registrado y asociado a la ejecución de la reserva #${reservationCode}.`);
    this.costFeedbackValid.set(true);
    this.costPanelOpen.set(false);
  }
}
