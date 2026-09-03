import { Component, computed, inject, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { OPERATOR_TODAY_DATE, OperatorReservationService } from '../operator-reservation.service';
import { OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../operator-catalog.service';

interface ServiceOption {
  key: string;
  name: string;
  price: number;
  discount: number;
  risk: boolean;
  lodgingCapacity: number;
  departures: string[];
  payments: string[];
  inclusions: string[];
  conditions: string[];
}

const TOUR_CATALOG_ID = 'catalogo-catalog-panel';
const LODGING_CATALOG_ID = 'hospedaje-catalog-panel';

// El catalogo de Catálogos (OPERATOR_CATALOG_DEFAULTS) todavia no modela salidas
// especificas, medios de pago aceptados ni inclusiones por servicio. Estos datos
// complementarios YA aprobados para los 4 tours base se conservan aqui, ligados al MISMO
// key/nombre ya usado en Catálogos: la identidad, tarifa, vigencia y estado activo/inactivo
// del servicio siempre se leen en vivo desde Catálogos, nunca desde esta lista.
const KNOWN_TOUR_DETAILS: Record<
  string,
  Pick<ServiceOption, 'discount' | 'risk' | 'departures' | 'payments' | 'inclusions' | 'conditions'>
> = {
  'Tour destino ejemplo - Montañas': {
    discount: 0.2,
    risk: false,
    departures: ['15 sep 2026', '22 sep 2026', '29 sep 2026'],
    payments: ['Transferencia', 'Efectivo', 'Abono'],
    inclusions: ['Alimentación incluida: plato del día', 'Transporte incluido: trayecto de ida y vuelta'],
    conditions: [
      'La modificación o cancelación depende de las condiciones vigentes del tour.',
      'La disponibilidad y los valores se validan antes de registrar la reserva.',
    ],
  },
  'Aventura en cenotes ocultos': {
    discount: 0,
    risk: false,
    departures: ['12 sep 2026', '19 sep 2026'],
    payments: ['Transferencia', 'Efectivo', 'Abono'],
    inclusions: ['Alimentación incluida: snack ligero', 'Transporte incluido: traslado al punto de salida'],
    conditions: [
      'La modificación o cancelación depende de las condiciones vigentes del tour.',
      'La disponibilidad y los valores se validan antes de registrar la reserva.',
    ],
  },
  'Rafting y acampada extrema': {
    discount: 0,
    risk: true,
    departures: ['13 sep 2026', '27 sep 2026'],
    payments: ['Transferencia', 'Abono'],
    inclusions: ['Alimentación incluida: refrigerio de la actividad', 'Transporte incluido: traslado al punto de salida'],
    conditions: [
      'La actividad requiere requisitos de riesgo para cada viajero.',
      'La modificación o cancelación depende de las condiciones vigentes del servicio.',
    ],
  },
  'Recorrido cultural e histórico': {
    discount: 0,
    risk: false,
    departures: ['16 sep 2026', '23 sep 2026', '30 sep 2026'],
    payments: ['Transferencia', 'Efectivo'],
    inclusions: ['Alimentación incluida: opción gastronómica del recorrido', 'Transporte incluido: trayecto programado'],
    conditions: [
      'La modificación o cancelación depende de las condiciones vigentes del servicio.',
      'Los descuentos se aplican según la configuración comercial vigente.',
    ],
  },
};

// Misma condicion generica ya usada para los tours del catalogo: se reutiliza para
// servicios nuevos que aun no tengan condiciones especificas parametrizadas (no se inventa
// una condicion nueva).
const GENERIC_CONDITION = 'La disponibilidad y los valores se validan antes de registrar la reserva.';
// PDR (linea 633): modalidades de pago soportadas en Fase 1 para el tenant.
const DEFAULT_PAYMENT_METHODS = ['Transferencia', 'Efectivo', 'Abono'];

function parseCOP(value: string | undefined): number {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

// Regla 1/2/5: la vigencia (rango inicio-fin) del catalogo NO es una salida reservable.
// Sin salidas especificas configuradas para el servicio, no se inventa ninguna fecha: si
// inicio y fin coinciden, esa unica fecha SI es una salida real; si son distintos, es un
// rango de vigencia sin salida puntual definida y no se muestra ninguna.
function resolveVigenciaDepartures(start: string, end: string): string[] {
  if (!start) return [];
  if (!end || end === start) return [start];
  return [];
}

function normalizeDocument(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

@Component({
  selector: 'app-operator-create-reservation',
  standalone: true,
  imports: [RouterLink, KeyValuePipe],
  templateUrl: './create-reservation.component.html',
  styleUrl: './create-reservation.component.css',
})
export class CreateReservationComponent {
  private readonly reservationService = inject(OperatorReservationService);
  private readonly catalogService = inject(OperatorCatalogService);
  private readonly router = inject(Router);

  // Regla 1/2/3/6: el selector se construye en vivo desde el MISMO catalogo ya usado en
  // Catálogos (solo activos y vigentes), sin listas independientes ni servicios
  // hardcodeados. Si el Administrador crea, activa, inactiva o actualiza un servicio, este
  // computed lo refleja automaticamente porque lee las MISMAS senales de OperatorCatalogService.
  services = computed<Record<string, ServiceOption>>(() => {
    const result: Record<string, ServiceOption> = {};
    const lodgingRecord = OPERATOR_CATALOG_DEFAULTS[LODGING_CATALOG_ID]?.records[0];
    const lodgingCapacity = (lodgingRecord && parseCOP(lodgingRecord.fields['capacity'])) || 2;

    for (const record of OPERATOR_CATALOG_DEFAULTS[TOUR_CATALOG_ID].records) {
      if (!this.catalogService.isActive(TOUR_CATALOG_ID, record.key, record.active)) continue;
      const details = KNOWN_TOUR_DETAILS[record.key];
      const [validityStart, validityEnd] = (record.fields['validity'] || '').split(' - ');
      const configuredDepartures = this.catalogService.getDepartures(record.key);
      result[record.key] = {
        key: record.key,
        name: record.fields['name'] || record.key,
        price: parseCOP(record.fields['tariff']),
        discount: details?.discount ?? 0,
        risk: details?.risk ?? false,
        lodgingCapacity,
        departures: configuredDepartures ?? (details ? details.departures : resolveVigenciaDepartures(validityStart, validityEnd)),
        payments: details?.payments ?? DEFAULT_PAYMENT_METHODS,
        inclusions: details?.inclusions ?? [],
        conditions: details?.conditions ?? [GENERIC_CONDITION],
      };
    }
    for (const resource of this.catalogService.newServices()) {
      if (resource.type !== 'tour' || !resource.active) continue;
      const configuredDepartures = this.catalogService.getDepartures(resource.id);
      result[resource.id] = {
        key: resource.id,
        name: resource.name,
        price: resource.price,
        discount: 0,
        risk: false,
        lodgingCapacity: resource.capacity ?? lodgingCapacity,
        departures: configuredDepartures ?? resolveVigenciaDepartures(resource.start, resource.end),
        payments: DEFAULT_PAYMENT_METHODS,
        inclusions: [],
        conditions: [resource.policy || GENERIC_CONDITION],
      };
    }
    return result;
  });

  serviceKey = signal('');
  departure = signal('');
  travelers = signal(2);
  lodging = signal('none');
  paymentMethod = signal('');
  holderDocument = signal('');
  companionDocuments = signal<string[]>([]);
  formValid = signal(false);
  feedback = signal('Completa los campos obligatorios para registrar la reserva.');
  feedbackIsValid = signal(false);

  selectedService = computed(() => this.services()[this.serviceKey()] || null);
  requiredCompanions = computed(() => Math.max(0, this.travelers() - 1));
  companionIndexes = computed(() => Array.from({ length: this.requiredCompanions() }, (_, index) => index));

  lodgingOverCapacity = computed(() => {
    const service = this.selectedService();
    return this.lodging() !== 'none' && !!service && this.travelers() > service.lodgingCapacity;
  });

  duplicatedDocument = computed(() => {
    const docs = [this.holderDocument(), ...this.companionDocuments()].map(normalizeDocument).filter(Boolean);
    return docs.some((doc, index) => docs.indexOf(doc) !== index);
  });

  serviceReady = computed(() => Boolean(this.selectedService() && this.departure()));

  projected = computed(() => {
    const service = this.selectedService();
    return service ? service.price * this.travelers() : 0;
  });
  discountValue = computed(() => {
    const service = this.selectedService();
    return service ? this.projected() * service.discount : 0;
  });
  finalValue = computed(() => this.projected() - this.discountValue());

  projectedLabel = computed(() => formatCurrency(this.projected()));
  discountLabel = computed(() => (this.discountValue() ? `-${formatCurrency(this.discountValue())}` : '$0'));
  finalLabel = computed(() => formatCurrency(this.finalValue()));

  showCapacityMessage = computed(() => Boolean(this.selectedService()) && this.lodging() !== 'none');
  hasLodgingCapacity = computed(() => {
    const service = this.selectedService();
    return service ? this.travelers() <= service.lodgingCapacity : true;
  });

  // El pipe "keyvalue" ordena alfabeticamente por defecto: se desactiva para conservar el
  // mismo orden ya usado en Catálogos.
  unsorted = (): number => 0;

  onServiceChange(value: string): void {
    this.serviceKey.set(value);
    this.departure.set('');
    this.paymentMethod.set('');
  }

  onTravelersChange(value: string): void {
    this.travelers.set(Math.max(1, Number.parseInt(value, 10) || 1));
  }

  setHolderDocument(value: string): void {
    this.holderDocument.set(value);
  }

  setCompanionDocument(index: number, value: string): void {
    const next = [...this.companionDocuments()];
    next[index] = value;
    this.companionDocuments.set(next);
  }

  validate(form: HTMLFormElement): void {
    const service = this.selectedService();
    const isValid = Boolean(this.serviceReady() && form.checkValidity() && !this.lodgingOverCapacity() && !this.duplicatedDocument());
    this.formValid.set(isValid);
    if (!service) this.feedback.set('Selecciona un servicio para consultar sus requisitos y valores.');
    else if (this.lodgingOverCapacity()) this.feedback.set('La capacidad del hospedaje no cubre la cantidad total de viajeros.');
    else if (this.duplicatedDocument()) this.feedback.set('El documento del titular y los acompañantes debe ser único dentro de la reserva.');
    else if (!form.checkValidity()) this.feedback.set('Completa los campos obligatorios y registra los requisitos aplicables.');
    else this.feedback.set('La reserva cumple las validaciones y está lista para registrarse.');
    this.feedbackIsValid.set(isValid);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    this.validate(form);
    if (!this.formValid()) return;

    const service = this.selectedService();
    if (!service) return;
    const holderName = String(new FormData(form).get('holderName') || '').trim();
    const code = 'RES-1843';
    const projected = this.projected();
    const discount = this.discountValue();

    this.reservationService.saveDraft({
      code,
      createdAt: OPERATOR_TODAY_DATE,
      customer: holderName,
      email: 'No registrado en esta vista',
      service: service.name,
      date: this.departure(),
      travelers: this.travelers(),
      companions: `${Math.max(0, this.travelers() - 1)} registrado(s)`,
      status: 'Pendiente de pago',
      statusClass: 'is-pending',
      projected: formatCurrency(projected),
      discount: discount ? `-${formatCurrency(discount)}` : '$0',
      final: formatCurrency(projected - discount),
      paid: '$0',
      balance: formatCurrency(projected - discount),
      payment: 'Sin pago',
      method: this.paymentMethod() || 'Sin modalidad definida',
      execution: 'Pendiente de ejecución',
      action: 'Gestionar pago',
      href: 'admin-pagos.html',
    });
    this.router.navigateByUrl('/operator/reservations/created');
  }
}
