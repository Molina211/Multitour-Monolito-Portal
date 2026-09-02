import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OperatorCatalogService } from '../operator-catalog.service';

type ServiceKind = 'operational' | 'establishment';
type EstablishmentType = 'hotel' | 'restaurant';

const ESTABLISHMENT_IMAGE_LABELS: Record<EstablishmentType, string> = {
  hotel: 'Imagen del hotel',
  restaurant: 'Imagen del restaurante',
};

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
  establishmentType = signal<EstablishmentType>('hotel');
  previewSrc = signal('');
  previewReady = signal(false);
  feedback = signal('Completa la información para publicar el producto en el catálogo del cliente.');

  imageLabel = computed(() =>
    this.kind() === 'establishment' ? ESTABLISHMENT_IMAGE_LABELS[this.establishmentType()] : 'Imagen del servicio',
  );

  onKindChange(value: string): void {
    this.kind.set(value === 'establishment' ? 'establishment' : 'operational');
  }

  onEstablishmentTypeChange(value: string): void {
    this.establishmentType.set(value === 'restaurant' ? 'restaurant' : 'hotel');
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
    this.catalogService.addNewService({
      id: `resource-${Date.now()}`,
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
    this.router.navigateByUrl('/operator/catalog');
  }
}
