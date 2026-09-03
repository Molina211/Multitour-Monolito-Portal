import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MonthlyConsolidation, OperatorCashService } from '../operator-cash.service';

function formatCOP(value: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(value))}`;
}

@Component({
  selector: 'app-operator-cash-monthly',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cash-monthly.component.html',
  styleUrl: './cash-monthly.component.css',
})
export class CashMonthlyComponent {
  private readonly cashService = inject(OperatorCashService);

  periods = computed<MonthlyConsolidation[]>(() => this.cashService.getMonthlyConsolidation());
  hasClosures = computed(() => this.periods().length > 0);

  formatAmount(value: number): string {
    return formatCOP(value);
  }
}
