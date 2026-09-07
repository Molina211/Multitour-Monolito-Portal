import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
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
export class AuditComponent implements OnInit {
  @ViewChild('auditDialog') auditDialog!: ElementRef<HTMLDialogElement>;

  selectedEvent = signal<PlatformAuditEvent | null>(null);

  private readonly platformData = inject(PlatformDataService);

  audit = this.platformData.audit;
  loading = this.platformData.auditLoading;
  error = this.platformData.auditError;

  ngOnInit(): void {
    void this.platformData.loadAudit();
  }

  detailFields(): AuditDetailField[] {
    const event = this.selectedEvent();
    if (!event) return [];
    return [
      { label: 'Fecha y hora', value: event.date },
      { label: 'Actor (membershipId)', value: event.actorId },
      { label: 'Operador', value: event.tenantName },
      { label: 'Acción', value: event.action },
      { label: 'Registro afectado', value: event.affectedRecordId || 'No aplica' },
      { label: 'Valor anterior', value: event.previousValue },
      { label: 'Valor nuevo', value: event.newValue },
      { label: 'Motivo', value: event.reason },
      { label: 'Módulo o canal', value: event.module },
      { label: 'Referencia funcional', value: event.functionalReference },
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
