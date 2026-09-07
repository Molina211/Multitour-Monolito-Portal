import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CashRegisterResponse } from '../../../core/cash-api.service';
import { formatCOP } from '../../../core/money.util';
import { OperatorCashService, formatTenantDateTime } from '../operator-cash.service';
import { OperatorRoleService } from '../operator-role.service';

@Component({
  selector: 'app-operator-cash-history',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cash-history.component.html',
  styleUrl: './cash-history.component.css',
})
export class CashHistoryComponent implements OnInit {
  private readonly cashService = inject(OperatorCashService);
  readonly roleService = inject(OperatorRoleService);

  loading = this.cashService.loading;
  closures = this.cashService.history;
  hasClosures = computed(() => this.closures().length > 0);

  correctionFeedback = signal<Record<string, { message: string; valid: boolean }>>({});
  submittingCorrection = signal<Record<string, boolean>>({});

  async ngOnInit(): Promise<void> {
    await this.cashService.refreshHistory();
  }

  formatAmount(value: number): string {
    return formatCOP(value);
  }

  totalsFor(closure: CashRegisterResponse) {
    return this.cashService.computeTotals(closure);
  }

  formatDateTime(isoDate: string): string {
    return formatTenantDateTime(isoDate);
  }

  correctionFeedbackFor(closureId: string): { message: string; valid: boolean } {
    return (
      this.correctionFeedback()[closureId] || {
        message: 'Solo el Administrador del operador puede registrar una corrección posterior al cierre.',
        valid: false,
      }
    );
  }

  async onCorrectionSubmit(event: Event, closure: CashRegisterResponse): Promise<void> {
    event.preventDefault();
    if (this.roleService.isColaborador()) return;
    const form = event.currentTarget as HTMLFormElement;
    const justification = String(new FormData(form).get('justification') || '').trim();
    if (!justification) {
      this.correctionFeedback.update((state) => ({
        ...state,
        [closure.cashRegisterId]: { message: 'Registra la justificación obligatoria de la corrección.', valid: false },
      }));
      return;
    }
    this.submittingCorrection.update((s) => ({ ...s, [closure.cashRegisterId]: true }));
    const result = await this.cashService.addCorrection(closure.cashRegisterId, justification);
    this.submittingCorrection.update((s) => ({ ...s, [closure.cashRegisterId]: false }));
    form.reset();
    this.correctionFeedback.update((state) => ({
      ...state,
      [closure.cashRegisterId]: { message: result.ok ? 'Corrección registrada correctamente.' : result.message, valid: result.ok },
    }));
  }
}
