import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OperatorCatalogService } from '../operator-catalog.service';

type ServiceKind = 'operational' | 'establishment';
type EstablishmentType = 'hotel' | 'restaurant';

const ESTABLISHMENT_IMAGE_LABELS: Record<EstablishmentType, string> = {
  hotel: 'Imagen del hotel',
  restaurant: 'Imagen del restaurante',
};

// Mismo formato ya usado en toda la app (es. "03 sep 2026").
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function formatDate(isoDate: string): string {
  const [year, month, day] = (isoDate || '').split('-');
  const monthName = MONTH_ABBR[Number(month) - 1];
  if (!year || !day || !monthName) return '';
  return `${day} ${monthName} ${year}`;
}

@Component({
  selector: 'app-operator-new-service',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './new-service.component.html',
  styleUrl: './new-service.component.css',
})
export class NewServiceComponent {
  private readonly catalogService = inject(OperatorCatalogService);
  private readonly router = inject(Router);

  kind = signal<ServiceKind>('operational');
  type = signal('tour');
  establishmentType = signal<EstablishmentType>('hotel');
  previewSrc = signal('');
  previewReady = signal(false);
  feedback = signal('Completa la información para publicar el producto en el catálogo del cliente.');

  imageLabel = computed(() =>
    this.kind() === 'establishment' ? ESTABLISHMENT_IMAGE_LABELS[this.establishmentType()] : 'Imagen del servicio',
  );

  // Regla 1/2 (RF-007/linea 452): las salidas son fechas reales de ejecucion, distintas de
  // la vigencia comercial. Solo aplican a "Tour o actividad", que es el unico tipo que
  // aparece como "Servicio principal" en Crear reserva; no se inventan horarios ni campos
  // adicionales, solo la fecha.
  showDepartures = computed(() => this.kind() === 'operational' && this.type() === 'tour');
  newDeparture = signal('');
  departureDates = signal<string[]>([]);

  departureRows = computed(() => this.departureDates().map((iso) => ({ iso, label: formatDate(iso) })));

  onKindChange(value: string): void {
    this.kind.set(value === 'establishment' ? 'establishment' : 'operational');
  }

  onTypeChange(value: string): void {
    this.type.set(value);
  }

  onEstablishmentTypeChange(value: string): void {
    this.establishmentType.set(value === 'restaurant' ? 'restaurant' : 'hotel');
  }

  setNewDeparture(value: string): void {
    this.newDeparture.set(value);
  }

  addDeparture(): void {
    const value = this.newDeparture();
    if (!value || this.departureDates().includes(value)) return;
    this.departureDates.set([...this.departureDates(), value].sort());
    this.newDeparture.set('');
  }

  removeDeparture(iso: string): void {
    this.departureDates.set(this.departureDates().filter((d) => d !== iso));
  }

  onImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      this.previewSrc.set(String(reader.result));
      this.previewReady.set(true);
    });
    reader.readAsDataURL(file);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);

    if (this.kind() === 'establishment') {
      if (!form.checkValidity() || !this.previewReady()) {
        this.feedback.set('Completa el nombre comercial y adjunta una imagen del establecimiento.');
        return;
      }
      this.catalogService.addAssociatedEstablishment({
        id: `establishment-${Date.now()}`,
        kind: this.establishmentType(),
        name: String(data.get('name') || '').trim(),
        description: String(data.get('establishmentInfo') || '').trim(),
        image: this.previewSrc(),
      });
      this.router.navigateByUrl('/operator/catalog');
      return;
    }

    const start = String(data.get('start') || '');
    const end = String(data.get('end') || '');
    if (!form.checkValidity() || end < start || !this.previewReady()) {
      this.feedback.set('Completa los datos, adjunta una imagen y define una vigencia válida.');
      return;
    }
    const id = `resource-${Date.now()}`;
    this.catalogService.addNewService({
      id,
      name: String(data.get('name') || '').trim(),
      type: String(data.get('type') || ''),
      price: Number(data.get('price') || 0),
      capacity: Number(data.get('capacity') || 0) || null,
      restrictions: String(data.get('restrictions') || '').trim(),
      start,
      end,
      policy: String(data.get('policy') || ''),
      image: this.previewSrc(),
      active: true,
    });
    // Regla 2/6: las salidas quedan asociadas al MISMO servicio (su id) y son la unica
    // fuente que Crear reserva consulta; sin salidas configuradas, no se guarda nada (no se
    // inventa una salida a partir de la vigencia).
    if (this.type() === 'tour' && this.departureDates().length) {
      this.catalogService.setDepartures(id, this.departureDates().map(formatDate));
    }
    this.router.navigateByUrl('/operator/catalog');
  }
}
