import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OperatorCatalogService } from '../operator-catalog.service';
import { CatalogApiService, CatalogItemRequest, CatalogItemType } from '../../../core/catalog-api.service';
import { EstablishmentApiService, EstablishmentKind } from '../../../core/establishment-api.service';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../../core/http-error.util';
import { SessionService } from '../../../core/session.service';

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
  private readonly catalogApi = inject(CatalogApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  kind = signal<ServiceKind>('operational');
  operationalType = signal('tour');
  establishmentType = signal<EstablishmentType>('hotel');
  previewSrc = signal('');
  previewReady = signal(false);
  feedback = signal('Completa la información para publicar el producto en el catálogo del cliente.');
  submitting = signal(false);

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
      const tenantId = this.sessionService.tenantId();
      if (!tenantId) {
        this.feedback.set('No hay una sesión activa.');
        return;
      }
      const kind: EstablishmentKind = this.establishmentType() === 'restaurant' ? 'RESTAURANT' : 'HOTEL';
      this.submitting.set(true);
      this.feedback.set('Publicando...');
      this.establishmentApi
        .create(tenantId, {
          kind,
          name: String(data.get('name') || '').trim(),
          description: String(data.get('establishmentInfo') || '').trim() || null,
          image: this.previewSrc() || null,
        })
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.router.navigateByUrl('/operator/catalog');
          },
          error: (err: HttpErrorResponse) => {
            this.submitting.set(false);
            this.feedback.set(this.mapCreateError(err));
          },
        });
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

    const tenantId = this.sessionService.tenantId();
    if (!tenantId) {
      this.feedback.set('No hay una sesión activa.');
      return;
    }

    const typeByForm: Record<string, CatalogItemType> = {
      tour: 'TOUR',
      lodging: 'LODGING',
      food: 'FOOD',
      transport: 'TRANSPORT',
    };
    const catalogItemType = typeByForm[type];
    if (!catalogItemType) {
      this.feedback.set('Selecciona un tipo de servicio válido.');
      return;
    }

    const request: CatalogItemRequest = {
      type: catalogItemType,
      name: String(data.get('name') || '').trim(),
      price: Number(data.get('price') || 0),
      capacity: Number(data.get('capacity') || 0) || null,
      restrictions: String(data.get('restrictions') || '').trim() || null,
      validFrom: start || null,
      validTo: end || null,
      policy: String(data.get('policy') || '') || null,
      image: this.previewSrc() || null,
      // RN-TRA-001 (trayecto): solo tiene sentido para type === 'transport'; no se inventa
      // uno para el resto de tipos ni si el campo quedo vacio.
      route: type === 'transport' ? String(data.get('route') || '').trim() || null : null,
      // BLOQUEO/INCOMPATIBILIDAD: este formulario no tiene un campo propio de "costo
      // operativo" al crear un Transporte (solo existe mas abajo, ligado al vinculo
      // Tour->Transporte, que el Backend no modela). Se crea en null y se completa despues
      // desde Configurar transporte (PATCH), que si expone ese campo.
      operationalCost: null,
    };

    this.submitting.set(true);
    this.feedback.set('Publicando...');
    this.catalogApi.create(tenantId, request).subscribe({
      next: (created) => {
        this.submitting.set(false);
        // RN-TRA-001/002: el vinculo Tour<->Transporte y su tarifa por persona NO existen
        // en el contrato Backend (CatalogItemRequest/Response no tienen un campo para
        // asociar un catalog-item con otro) - se mantiene esta relacion SOLO en el mock
        // local (OperatorCatalogService), documentado como BLOQUEO, no resuelto aqui.
        if (type === 'tour' && this.includesTransport() === 'si') {
          const transportKey = this.selectedTransportKey();
          this.catalogService.updateTransportResourceConfig(transportKey, {
            route: this.transportRouteInput(),
            capacity: this.transportCapacityInput() ? Number(this.transportCapacityInput()) : null,
            cost: this.transportCostInput() ? Number(this.transportCostInput()) : 0,
          });
          const tariffOverride = this.transportTariffInput() ? Number(this.transportTariffInput()) : undefined;
          this.catalogService.setTourTransport(created.catalogItemId, transportKey, tariffOverride);
        }
        this.router.navigateByUrl('/operator/catalog');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.feedback.set(this.mapCreateError(err));
      },
    });
  }

  private mapCreateError(error: HttpErrorResponse): string {
    if (error.status === 400) return error.error?.message || 'Revisa los datos ingresados (por ejemplo, la capacidad es obligatoria para Hospedaje).';
    if (error.status === 404) return 'El operador no existe.';
    if (error.status === 409) return 'El operador está inactivo; no admite altas de catálogo.';
    if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
    return 'No fue posible publicar el servicio.';
  }
}
