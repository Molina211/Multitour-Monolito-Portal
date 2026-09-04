import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CashMovement, CashMovementType, OperatorCashService } from '../operator-cash.service';
import { OperatorRoleService } from '../operator-role.service';

function formatCOP(value: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(value))}`;
}

function formatSignedCOP(value: number): string {
  return value < 0 ? `-${formatCOP(Math.abs(value))}` : formatCOP(value);
}

interface CashMovementRow {
  time: string;
  type: CashMovementType;
  concept: string;
  displayAmount: string;
  responsible: string;
}

@Component({
  selector: 'app-operator-cash',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cash.component.html',
  styleUrl: './cash.component.css',
})
export class CashComponent {
  private readonly cashService = inject(OperatorCashService);
  readonly roleService = inject(OperatorRoleService);

  private get currentActor(): string {
    return this.roleService.roleLabel();
  }

  private readonly refresh = signal(0);

  day = computed(() => {
    this.refresh();
    return this.cashService.getDay();
  });
  closed = computed(() => this.day().status === 'cerrada');

  totals = computed(() => {
    this.refresh();
    return this.cashService.computeTotals(this.day());
  });

  dayStatusLabel = computed(() => (this.closed() ? 'Jornada cerrada' : 'Jornada abierta'));
  totalHeadline = computed(
    () => `${formatCOP(this.totals().total)} disponibles ${this.closed() ? 'al cierre de la jornada' : 'al cierre parcial'}.`,
  );

  baseLabel = computed(() => formatCOP(this.day().base));
  ingresosLabel = computed(() => formatCOP(this.totals().ingresos));
  pagosOperacionalesLabel = computed(() => formatCOP(this.totals().pagosOperacionales));
  gastosLabel = computed(() => formatCOP(this.totals().gastos));
  devolucionesLabel = computed(() => formatCOP(this.totals().devoluciones));

  movementRows = computed<CashMovementRow[]>(() => {
    const day = this.day();
    const refundMovements = this.totals().refundMovements;
    const own: CashMovementRow[] = day.movements.map((m: CashMovement) => ({
      time: m.time,
      type: m.type,
      concept: m.concept,
      displayAmount: formatSignedCOP(m.amount),
      responsible: m.responsible,
    }));
    const refunds: CashMovementRow[] = refundMovements.map((m) => ({
      time: m.time,
      type: m.type,
      concept: m.concept,
      displayAmount: m.displayAmount,
      responsible: m.responsible,
    }));
    return [...own, ...refunds];
  });

  // Regla 5 (PDR linea 767/1021): solo el Administrador del operador puede modificar la
  // base diaria.
  adjustPanelOpen = signal(false);
  currentBase = computed(() => this.day().base);
  adjustFeedback = signal('Registra la nueva base diaria parametrizada para hoy.');
  adjustFeedbackValid = signal(false);

  openAdjust(): void {
    // Regla 5 (PDR linea 767/1021): solo el Administrador del operador puede modificar la
    // base diaria.
    if (this.closed() || this.roleService.isColaborador()) return;
    this.adjustFeedback.set('Registra la nueva base diaria parametrizada para hoy.');
    this.adjustFeedbackValid.set(false);
    this.adjustPanelOpen.set(true);
  }

  cancelAdjust(): void {
    this.adjustPanelOpen.set(false);
  }

  onAdjustSubmit(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const rawValue = String(new FormData(form).get('base') ?? '');
    const value = Number(rawValue);
    if (rawValue === '' || Number.isNaN(value) || value < 0) {
      this.adjustFeedback.set('Registra una base diaria válida.');
      this.adjustFeedbackValid.set(false);
      return;
    }
    this.cashService.adjustBase(value);
    this.adjustFeedback.set('Base diaria actualizada correctamente.');
    this.adjustFeedbackValid.set(true);
    this.adjustPanelOpen.set(false);
    this.refresh.update((n) => n + 1);
  }

  movementFeedback = signal(
    'Registra los movimientos de la jornada. Las devoluciones se agregan automáticamente cuando quedan efectivamente ejecutadas.',
  );
  movementFeedbackValid = signal(false);

  onMovementSubmit(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const type = String(data.get('type') || '') as CashMovementType | '';
    const concept = String(data.get('concept') || '').trim();
    const amount = Number(data.get('amount'));
    if (!type || type === 'Devolución' || !concept || !amount || amount <= 0) {
      this.movementFeedback.set('Completa tipo, concepto y un valor mayor a $0 para registrar el movimiento.');
      this.movementFeedbackValid.set(false);
      return;
    }
    this.cashService.registerMovement(type, concept, amount, this.currentActor);
    form.reset();
    this.movementFeedback.set('Movimiento registrado correctamente.');
    this.movementFeedbackValid.set(true);
    this.refresh.update((n) => n + 1);
  }

  // Regla 7 (PDR linea 767/773): cerrar caja conserva el cierre y el historico de
  // movimientos; nunca borra informacion.
  closeDay(): void {
    if (this.closed()) return;
    const { duplicate } = this.cashService.closeDay(this.currentActor);
    if (duplicate) {
      this.movementFeedback.set('Ya existe un cierre registrado para esta fecha. Usa Historial de caja para registrar una corrección.');
      this.movementFeedbackValid.set(false);
    } else {
      this.movementFeedback.set('Caja cerrada correctamente. El cierre e histórico quedaron conservados.');
      this.movementFeedbackValid.set(true);
    }
    this.refresh.update((n) => n + 1);
  }
}
