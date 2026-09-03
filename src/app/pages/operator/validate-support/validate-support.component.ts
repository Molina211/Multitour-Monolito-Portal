import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OperatorReservationService } from '../operator-reservation.service';

const SUPPORT_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
// Iconos genericos (no son comprobantes reales): solo representan el tipo de archivo adjunto.
const SUPPORT_IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="140" viewBox="0 0 220 140">' +
      '<rect width="220" height="140" rx="10" fill="#eef5f1"/>' +
      '<path d="M32 104l38-42 26 28 22-24 40 38" stroke="#8fae9f" stroke-width="5" fill="none"/>' +
      '<circle cx="66" cy="46" r="11" fill="#8fae9f"/>' +
      '</svg>',
  );
const SUPPORT_DOCUMENT_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="280" viewBox="0 0 220 280">' +
      '<rect x="10" y="10" width="200" height="260" rx="6" fill="#ffffff" stroke="#cbd8d2" stroke-width="2"/>' +
      '<path d="M150 10v40h40z" fill="#e3ece7"/>' +
      '<rect x="30" y="70" width="140" height="10" rx="3" fill="#dbe6e1"/>' +
      '<rect x="30" y="95" width="140" height="10" rx="3" fill="#dbe6e1"/>' +
      '<rect x="30" y="120" width="90" height="10" rx="3" fill="#dbe6e1"/>' +
      '<rect x="30" y="220" width="52" height="24" rx="4" fill="#c0392b"/>' +
      '<text x="40" y="237" font-family="Arial" font-size="13" fill="#ffffff">PDF</text>' +
      '</svg>',
  );

type SupportFileType = 'image' | 'document' | 'none';

function classifySupportFile(filename: string | undefined): SupportFileType {
  if (!filename) return 'none';
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return SUPPORT_IMAGE_EXTENSIONS.includes(ext) ? 'image' : 'document';
}

@Component({
  selector: 'app-operator-validate-support',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './validate-support.component.html',
  styleUrl: './validate-support.component.css',
})
export class ValidateSupportComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reservationService = inject(OperatorReservationService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  readonly record = this.reservationService.getPendingSupportRecords().find((item) => item.code === this.code) || null;
  readonly notFound = !this.record;

  private readonly initialDecision = this.record ? this.reservationService.getPaymentSupportDecision(this.code) : null;

  currentStatus = signal(this.initialDecision?.status || this.record?.status || '');
  resolved = signal(Boolean(this.initialDecision));
  reason = signal('');

  supportType = classifySupportFile(this.record?.support);
  supportImagePlaceholder = SUPPORT_IMAGE_PLACEHOLDER;
  supportDocumentPlaceholder = SUPPORT_DOCUMENT_PLACEHOLDER;
  supportFilenameLabel = this.record?.support ? `Archivo: ${this.record.support}` : 'Sin soporte adjunto';
  documentOpen = signal(false);

  toggleDocument(): void {
    this.documentOpen.set(!this.documentOpen());
  }

  feedback = signal(
    this.notFound
      ? 'No se encontró el soporte de pago seleccionado. Vuelve a Pagos e ingresa nuevamente por Validar soporte.'
      : this.initialDecision
        ? `Este soporte ya fue ${this.initialDecision.status === 'Rechazado' ? 'rechazado' : 'validado'}. No se puede volver a decidir sobre el mismo intento.`
        : 'Registra el motivo y decide si apruebas o rechazas el soporte.',
  );
  feedbackIsValid = signal(false);

  disabled = computed(() => this.notFound || this.resolved());

  decide(action: 'approve' | 'reject'): void {
    if (this.disabled() || !this.record) return;
    const reason = this.reason().trim();
    if (!reason) {
      this.feedback.set('Registra el motivo obligatorio antes de aprobar o rechazar el soporte.');
      this.feedbackIsValid.set(false);
      return;
    }
    const decision = this.reservationService.decidePaymentSupport(this.code, action, reason, 'Administrador del operador');
    this.currentStatus.set(decision.status);
    this.feedback.set(action === 'approve' ? 'Soporte aprobado correctamente.' : 'Soporte rechazado correctamente.');
    this.feedbackIsValid.set(true);
    this.resolved.set(true);
    window.setTimeout(() => this.router.navigateByUrl('/operator/payments'), 1400);
  }
}
