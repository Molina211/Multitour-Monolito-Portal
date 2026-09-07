import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatCOP } from '../../../core/money.util';
import { OperatorCashService } from '../operator-cash.service';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-operator-cash-monthly',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cash-monthly.component.html',
  styleUrl: './cash-monthly.component.css',
})
export class CashMonthlyComponent implements OnInit {
  private readonly cashService = inject(OperatorCashService);

  loading = this.cashService.loading;
  period = signal(currentPeriod());
  periods = this.cashService.consolidation;
  hasClosures = computed(() => this.periods().length > 0);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  onPeriodChange(value: string): void {
    this.period.set(value);
    void this.load();
  }

  private async load(): Promise<void> {
    await this.cashService.refreshMonthlyConsolidation(this.period());
  }

  formatAmount(value: number): string {
    return formatCOP(value);
  }
}
