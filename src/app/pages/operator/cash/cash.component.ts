import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CashMovementLabel } from '../../../core/cash-api.service';
import { formatCOP } from '../../../core/money.util';
import { OperatorCashService } from '../operator-cash.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-cash',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './cash.component.html',
  styleUrl: './cash.component.css',
})
export class CashComponent implements OnInit {
  private readonly cashService = inject(OperatorCashService);
  readonly roleService = inject(OperatorRoleService);

  loading = this.cashService.loading;
  error = this.cashService.error;
  day = this.cashService.current;
  notOpenToday = this.cashService.notOpenToday;
  closed = computed(() => this.day()?.status === 'CERRADA');

  totals = computed(() => {
    const day = this.day();
    return day ? this.cashService.computeTotals(day) : { ingresos: 0, pagosOperacionales: 0, gastos: 0 };
  });

  dayStatusLabel = computed(() => (this.closed() ? 'Jornada cerrada' : this.notOpenToday() ? 'Sin jornada abierta hoy' : 'Jornada abierta'));
  totalHeadline = computed(() => {
    const day = this.day();
    return day ? `${formatCOP(day.totalAmount)} disponibles ${this.closed() ? 'al cierre de la jornada' : 'al cierre parcial'}.` : '';
  });

  baseLabel = computed(() => formatCOP(this.day()?.baseAmount ?? 0));
  ingresosLabel = computed(() => formatCOP(this.totals().ingresos));
  pagosOperacionalesLabel = computed(() => formatCOP(this.totals().pagosOperacionales));
  gastosLabel = computed(() => formatCOP(this.totals().gastos));

  async ngOnInit(): Promise<void> {
    await this.cashService.refreshToday();
  }

  openPanelOpen = signal(false);
  openFeedback = signal('');
  openFeedbackValid = signal(false);
  submittingOpen = signal(false);

  openOpenPanel(): void {
    if (this.roleService.isColaborador()) return;
    this.openFeedback.set('Registra la base diaria para abrir la jornada.');
    this.openFeedbackValid.set(false);
    this.openPanelOpen.set(true);
  }

  cancelOpen(): void {
    this.openPanelOpen.set(false);
  }

  async onOpenSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const value = Number(new FormData(form).get('base'));
    if (Number.isNaN(value) || value < 0) {
      this.openFeedback.set('Registra una base diaria válida.');
      this.openFeedbackValid.set(false);
      return;
    }
    this.submittingOpen.set(true);
    const result = await this.cashService.open(value);
    this.submittingOpen.set(false);
    if (!result.ok) {
      this.openFeedback.set(result.message);
      this.openFeedbackValid.set(false);
      return;
    }
    this.openFeedback.set('Jornada abierta correctamente.');
    this.openFeedbackValid.set(true);
    this.openPanelOpen.set(false);
  }

  movementFeedback = signal('Registra los movimientos de la jornada.');
  movementFeedbackValid = signal(false);
  submittingMovement = signal(false);

  async onMovementSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const type = String(data.get('type') || '') as CashMovementLabel | '';
    const concept = String(data.get('concept') || '').trim();
    const amount = Number(data.get('amount'));
    if (!type || !concept || !amount || amount <= 0) {
      this.movementFeedback.set('Completa tipo, concepto y un valor mayor a $0 para registrar el movimiento.');
      this.movementFeedbackValid.set(false);
      return;
    }
    this.submittingMovement.set(true);
    const result = await this.cashService.registerMovement(type, concept, amount);
    this.submittingMovement.set(false);
    if (!result.ok) {
      this.movementFeedback.set(result.message);
      this.movementFeedbackValid.set(false);
      return;
    }
    form.reset();
    this.movementFeedback.set('Movimiento registrado correctamente.');
    this.movementFeedbackValid.set(true);
  }

  closingDay = signal(false);

  async closeDay(): Promise<void> {
    if (this.closed()) return;
    this.closingDay.set(true);
    const result = await this.cashService.closeDay();
    this.closingDay.set(false);
    this.movementFeedback.set(result.ok ? 'Caja cerrada correctamente. El cierre e histórico quedaron conservados.' : result.message);
    this.movementFeedbackValid.set(result.ok);
  }
}
