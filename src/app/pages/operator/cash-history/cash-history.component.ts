import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CashClosure, OperatorCashService, formatTenantDateTime } from '../operator-cash.service';
import { OperatorRoleService } from '../operator-role.service';

function formatCOP(value: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(value))}`;
}

@Component({
  selector: 'app-operator-cash-history',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cash-history.component.html',
  styleUrl: './cash-history.component.css',
})
export class CashHistoryComponent {
  private readonly cashService = inject(OperatorCashService);
  readonly roleService = inject(OperatorRoleService);
  private readonly refresh = signal(0);

  closures = computed<CashClosure[]>(() => {
    this.refresh();
    return this.cashService.getClosures().slice().reverse();
  });
  hasClosures = computed(() => this.closures().length > 0);

  correctionFeedback = signal<Record<string, { message: string; valid: boolean }>>({});

  formatAmount(value: number): string {
    return formatCOP(value);
  }

  // La fecha/hora del cierre y sus correcciones deben mostrarse SIEMPRE en la zona horaria
  // local del tenant (America/Bogota), nunca en la del navegador de quien consulta.
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

  // Regla 8 (PDR linea 773/776): toda correccion posterior al cierre queda restringida al
  // Administrador del operador, exige justificacion obligatoria y trazabilidad, y NUNCA
  // sobrescribe los valores originales del cierre (se agrega como historial adicional).
  onCorrectionSubmit(event: Event, closureId: string): void {
    event.preventDefault();
    if (this.roleService.isColaborador()) return;
    const form = event.currentTarget as HTMLFormElement;
    const justification = String(new FormData(form).get('justification') || '').trim();
    if (!justification) {
      this.correctionFeedback.update((state) => ({
        ...state,
        [closureId]: { message: 'Registra la justificación obligatoria de la corrección.', valid: false },
      }));
      return;
    }
    this.cashService.addCorrection(closureId, justification, this.roleService.roleLabel());
    form.reset();
    this.correctionFeedback.update((state) => ({
      ...state,
      [closureId]: { message: 'Corrección registrada correctamente.', valid: true },
    }));
    this.refresh.update((n) => n + 1);
  }
}
