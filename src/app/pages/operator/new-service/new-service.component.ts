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
  operationalType = signal('tour');
  establishmentType = signal<EstablishmentType>('hotel');
  previewSrc = signal('');
  previewReady = signal(false);
  feedback = signal('Completa la información para publicar el producto en el catálogo del cliente.');

  // Tour <-> Transporte (RN-TRA-001/002): solo aplica cuando el Tipo es "Tour o actividad".
  includesTransport = signal<'no' | 'si'>('no');
  selectedTransportKey = signal('');
  // Capacidad/cupo propia del Tour (campo "capacity" del formulario), solo para mostrarla
  // junto a la capacidad del Transporte asociado: son independientes, nunca se copia una
  // sobre la otra.
  tourCapacityInput = signal('');

  // CONFIGURACIÓN DEL TRANSPORTE: editable directamente aqui. Trayecto/capacidad/costo son
  // globales del recurso de Transporte (se guardan igual que en Configurar transporte). La
  // tarifa por persona es especifica de ESTE Tour (RN-TRA-002): se precarga con la tarifa
  // generica del transporte como punto de partida, pero el Administrador puede darle a
  // este Tour una tarifa propia sin alterar la de otros tours que usen el mismo transporte.
  transportRouteInput = signal('');
  transportTariffInput = signal('');
  transportCapacityInput = signal('');
  transportCostInput = signal('');

  // Solo transportes reales, activos y vigentes (OperatorCatalogService), igual que
  // Gestionar transporte: nunca se hardcodea ni se ofrecen inactivos.
  activeTransportOptions = computed(() => this.catalogService.getActiveTransportOptions());
  selectedTransportOption = computed(
    () => this.activeTransportOptions().find((option) => option.key === this.selectedTransportKey()) || null,
  );

  onTransportSelected(key: string): void {
    this.selectedTransportKey.set(key);
    const option = this.activeTransportOptions().find((o) => o.key === key) || null;
    this.transportRouteInput.set(option && option.route !== 'Por configurar' ? option.route : '');
    this.transportTariffInput.set(option && option.price > 0 ? String(option.price) : '');
    this.transportCapacityInput.set(option && option.capacity != null ? String(option.capacity) : '');
    this.transportCostInput.set(option && option.cost > 0 ? String(option.cost) : '');
  }

  imageLabel = computed(() =>
    this.kind() === 'establishment' ? ESTABLISHMENT_IMAGE_LABELS[this.establishmentType()] : 'Imagen del servicio',
  );

  onKindChange(value: string): void {
    this.kind.set(value === 'establishment' ? 'establishment' : 'operational');
  }

  onOperationalTypeChange(value: string): void {
    this.operationalType.set(value);
  }

  onIncludesTransportChange(value: string): void {
    this.includesTransport.set(value === 'si' ? 'si' : 'no');
    if (value !== 'si') this.selectedTransportKey.set('');
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
    const type = String(data.get('type') || '');
    // RN-TRA-001/002: si el Tour declara transporte incluido, debe seleccionarse un
    // recurso de transporte real (activo); nunca se guarda una relacion vacia como "si".
    if (type === 'tour' && this.includesTransport() === 'si' && !this.selectedTransportOption()) {
      this.feedback.set('Selecciona un transporte activo para asociarlo a este Tour, o marca "No" si no incluye transporte.');
      return;
    }
    const id = `resource-${Date.now()}`;
    this.catalogService.addNewService({
      id,
      name: String(data.get('name') || '').trim(),
      type,
      price: Number(data.get('price') || 0),
      capacity: Number(data.get('capacity') || 0) || null,
      restrictions: String(data.get('restrictions') || '').trim(),
      start,
      end,
      policy: String(data.get('policy') || ''),
      image: this.previewSrc(),
      active: true,
      // RN-TRA-001 (trayecto): solo tiene sentido para type === 'transport'; no se inventa
      // uno para el resto de tipos ni si el campo quedo vacio.
      route: type === 'transport' ? String(data.get('route') || '').trim() || undefined : undefined,
    });
    if (type === 'tour' && this.includesTransport() === 'si') {
      const transportKey = this.selectedTransportKey();
      // Trayecto/capacidad/costo: configuracion global del recurso de Transporte (mismo
      // mecanismo que Configurar transporte, reutilizado aqui para no duplicar logica).
      this.catalogService.updateTransportResourceConfig(transportKey, {
        route: this.transportRouteInput(),
        capacity: this.transportCapacityInput() ? Number(this.transportCapacityInput()) : null,
        cost: this.transportCostInput() ? Number(this.transportCostInput()) : 0,
      });
      // Tarifa por persona: especifica de este Tour (RN-TRA-002).
      const tariffOverride = this.transportTariffInput() ? Number(this.transportTariffInput()) : undefined;
      this.catalogService.setTourTransport(id, transportKey, tariffOverride);
    }
    this.router.navigateByUrl('/operator/catalog');
  }
}
