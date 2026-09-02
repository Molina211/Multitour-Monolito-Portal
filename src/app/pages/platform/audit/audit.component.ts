import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { PlatformAuditEvent, PlatformDataService } from '../platform-data.service';

interface AuditDetailField {
  label: string;
  value: string;
}

@Component({
  selector: 'app-platform-audit',
  standalone: true,
  imports: [],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css',
})
export class AuditComponent {
  @ViewChild('auditDialog') auditDialog!: ElementRef<HTMLDialogElement>;

  selectedEvent = signal<PlatformAuditEvent | null>(null);

  private readonly platformData = inject(PlatformDataService);

  audit = this.platformData.audit;

  detailFields(): AuditDetailField[] {
    const event = this.selectedEvent();
    if (!event) return [];
    return [
      { label: 'Fecha y hora', value: event.date },
      { label: 'Usuario', value: event.actorName || 'Fernanda Robayo' },
      { label: 'Rol', value: event.actorRole || 'Administrador de plataforma' },
      { label: 'Operador', value: event.tenant },
      { label: 'Acción', value: event.action },
      { label: 'Registro afectado', value: event.recordAffected || event.tenantId || 'No aplica' },
      { label: 'Valor anterior', value: event.previousValue || 'No aplica' },
      { label: 'Valor nuevo', value: event.newValue || event.detail || 'No aplica' },
      { label: 'Motivo', value: event.reason || 'No aplica' },
      { label: 'Módulo o canal', value: event.module || 'No aplica' },
      { label: 'Referencia funcional', value: event.functionalReference || 'No aplica' },
    ];
  }

  openDetail(event: PlatformAuditEvent): void {
    this.selectedEvent.set(event);
    this.auditDialog.nativeElement.showModal();
  }

  closeDetail(): void {
    this.auditDialog.nativeElement.close();
  }
}
