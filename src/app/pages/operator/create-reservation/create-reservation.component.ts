import { Component, computed, inject, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CompanionRecord, OPERATOR_TODAY_DATE, OperatorReservationService } from '../operator-reservation.service';
import { OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService, TransportCatalogOption } from '../operator-catalog.service';

interface ServiceOption {
  key: string;
  name: string;
  price: number;
  discount: number;
  risk: boolean;
  lodgingCapacity: number;
  start: string;
  end: string;
  payments: string[];
  inclusions: string[];
  conditions: string[];
  // RN-TRA-001/002: transporte REAL asociado a este Tour (relacion Tour -> Transporte
  // configurada por el Administrador en Nuevo servicio, resuelta en vivo desde
  // OperatorCatalogService). null si el Tour no tiene transporte asociado, o si el
  // transporte asociado ya no esta activo. Nunca se hardcodea un trayecto/tarifa aqui.
  associatedTransport: TransportCatalogOption | null;
}

const TOUR_CATALOG_ID = 'catalogo-catalog-panel';
const LODGING_CATALOG_ID = 'hospedaje-catalog-panel';

// El catalogo de Catálogos (OPERATOR_CATALOG_DEFAULTS) todavia no modela medios de pago
// aceptados ni inclusiones por servicio. Estos datos complementarios YA aprobados para los 4
// tours base se conservan aqui, ligados al MISMO key/nombre ya usado en Catálogos: la
// identidad, tarifa, vigencia y estado activo/inactivo del servicio siempre se leen en vivo
// desde Catálogos, nunca desde esta lista.
// CORRECCION PDR v1.7.1 (03-product/prd.md linea 1006): el PDR no define una parametrizacion
// independiente de "salidas", por lo que este mapa ya no expone una lista propia de fechas.
// AJUSTE (Tour <-> Transporte real): "inclusions" ya no declara un texto fijo de
// transporte ("Transporte incluido: ..."). La informacion de transporte de cada Tour
// ahora sale exclusivamente de la relacion real Tour -> Transporte (OperatorCatalogService,
// configurada en Nuevo servicio), nunca de un texto hardcodeado aqui.
const KNOWN_TOUR_DETAILS: Record<
  string,
  Pick<ServiceOption, 'discount' | 'risk' | 'payments' | 'inclusions' | 'conditions'>
> = {
  'Tour destino ejemplo - Montañas': {
    discount: 0.2,
    risk: false,
    payments: ['Transferencia', 'Efectivo', 'Abono'],
    inclusions: ['Alimentación incluida: plato del día'],
    conditions: [
      'La modificación o cancelación depende de las condiciones vigentes del tour.',
      'La disponibilidad y los valores se validan antes de registrar la reserva.',
    ],
  },
  'Aventura en cenotes ocultos': {
    discount: 0,
    risk: false,
    payments: ['Transferencia', 'Efectivo', 'Abono'],
    inclusions: ['Alimentación incluida: snack ligero'],
    conditions: [
      'La modificación o cancelación depende de las condiciones vigentes del tour.',
      'La disponibilidad y los valores se validan antes de registrar la reserva.',
    ],
  },
  'Rafting y acampada extrema': {
    discount: 0,
    risk: true,
    payments: ['Transferencia', 'Abono'],
    inclusions: ['Alimentación incluida: refrigerio de la actividad'],
    conditions: [
      'La actividad requiere requisitos de riesgo para cada viajero.',
      'La modificación o cancelación depende de las condiciones vigentes del servicio.',
    ],
  },
  'Recorrido cultural e histórico': {
    discount: 0,
    risk: false,
    payments: ['Transferencia', 'Efectivo'],
    inclusions: ['Alimentación incluida: opción gastronómica del recorrido'],
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

// Convierte el formato ya usado en Catálogos ("01 sep 2026") a ISO (yyyy-mm-dd), necesario
// para acotar el selector de fecha del servicio a su vigencia real (min/max).
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function parseCatalogDate(text: string | undefined): string {
  const match = /^(\d{1,2})\s+([a-z]{3})\s+(\d{4})$/i.exec((text || '').trim());
  if (!match) return '';
  const monthIndex = MONTH_ABBR.indexOf(match[2].toLowerCase());
  if (monthIndex === -1) return '';
  return `${match[3]}-${String(monthIndex + 1).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
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
      const start = parseCatalogDate(validityStart);
      result[record.key] = {
        key: record.key,
        name: record.fields['name'] || record.key,
        price: parseCOP(record.fields['tariff']),
        discount: details?.discount ?? 0,
        risk: details?.risk ?? false,
        lodgingCapacity,
        start,
        end: parseCatalogDate(validityEnd) || start,
        payments: details?.payments ?? DEFAULT_PAYMENT_METHODS,
        inclusions: details?.inclusions ?? [],
        conditions: details?.conditions ?? [GENERIC_CONDITION],
        // Relacion Tour -> Transporte real (RN-TRA-001/002), resuelta en vivo: si el
        // Administrador nunca asocio un transporte a este Tour, o si el asociado ya no
        // esta activo, esto es null (nunca se inventa ni se conserva uno inexistente).
        associatedTransport: this.catalogService.getTourTransport(record.key),
      };
    }
    for (const resource of this.catalogService.newServices()) {
      if (resource.type !== 'tour' || !resource.active) continue;
      result[resource.id] = {
        key: resource.id,
        name: resource.name,
        price: resource.price,
        discount: 0,
        risk: false,
        lodgingCapacity: resource.capacity ?? lodgingCapacity,
        start: resource.start,
        end: resource.end,
        payments: DEFAULT_PAYMENT_METHODS,
        inclusions: [],
        conditions: [resource.policy || GENERIC_CONDITION],
        associatedTransport: this.catalogService.getTourTransport(resource.id),
      };
    }
    return result;
  });

  // Transporte (PDR 1.7.1, RN-TRA-001/002): mismo catalogo real de Transporte ya usado en
  // Catálogos/Nuevo servicio (solo activo y vigente). Este selector general SOLO aplica a
  // Tours sin transporte asociado (ver serviceIncludesTransport); para los que ya tienen
  // uno real asociado, ofrecerlo duplicaria o contradiria el transporte del Tour.
  transportOptions = computed<TransportCatalogOption[]>(() => this.catalogService.getActiveTransportOptions());

  serviceKey = signal('');
  departure = signal('');
  travelers = signal(2);
  lodging = signal('none');
  transport = signal('none');
  paymentMethod = signal('');
  holderDocument = signal('');
  companionDocuments = signal<string[]>([]);
  companionNames = signal<string[]>([]);
  companionBirthDates = signal<string[]>([]);
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

  // CASO A/B (Tour <-> Transporte real): si el Tour seleccionado tiene un transporte
  // realmente asociado (Nuevo servicio), se reconoce automaticamente y el selector manual
  // no se ofrece (evita la contradiccion "Transporte incluido" + "No aplica"). Si no tiene
  // ninguno asociado, se habilita el selector manual de transportes activos (CASO B).
  serviceIncludesTransport = computed(() => Boolean(this.selectedService()?.associatedTransport));

  selectedTransport = computed<TransportCatalogOption | null>(() => {
    const service = this.selectedService();
    if (service?.associatedTransport) return service.associatedTransport;
    if (this.serviceIncludesTransport()) return null;
    return this.transportOptions().find((option) => option.key === this.transport()) || null;
  });
  transportOverCapacity = computed(() => {
    const option = this.selectedTransport();
    if (!option || option.capacity == null) return false;
    if (!this.serviceIncludesTransport() && this.transport() === 'none') return false;
    return this.travelers() > option.capacity;
  });
  transportHasKnownCapacity = computed(() => {
    const option = this.selectedTransport();
    return !!option && option.capacity != null;
  });

  duplicatedDocument = computed(() => {
    const docs = [this.holderDocument(), ...this.companionDocuments()].map(normalizeDocument).filter(Boolean);
    return docs.some((doc, index) => docs.indexOf(doc) !== index);
  });

  // CORRECCION PDR v1.7.1: la fecha del servicio se valida contra su vigencia de oferta
  // (activo + rango de fechas), no contra una lista de salidas parametrizadas aparte.
  dateWithinValidity = computed(() => {
    const service = this.selectedService();
    const date = this.departure();
    return Boolean(service && date && date >= service.start && date <= service.end);
  });
  serviceReady = computed(() => Boolean(this.selectedService()) && this.dateWithinValidity());

  departureHint = computed(() => {
    const service = this.selectedService();
    if (!service) return 'Selecciona primero un servicio';
    if (service.start === service.end) return `Fecha disponible: ${service.start}.`;
    return `Selecciona una fecha entre ${service.start} y ${service.end}.`;
  });

  // Recalculo reactivo (PDR RN-TRA-001, tarifa por persona): al cambiar el servicio, la
  // cantidad de viajeros o el transporte seleccionado, el valor proyectado se recalcula
  // automaticamente porque depende de estos MISMOS signals.
  projected = computed(() => {
    const service = this.selectedService();
    if (!service) return 0;
    const transportOption = this.selectedTransport();
    const transportCost = transportOption ? transportOption.price * this.travelers() : 0;
    return service.price * this.travelers() + transportCost;
  });
  // El descuento parametrizado del servicio (RF-005/RN-RES-002) se calcula sobre el valor
  // del servicio principal, no sobre el transporte: no existe en el catalogo un descuento
  // propio para Transporte, y no se inventa uno extendiendo el del tour.
  discountValue = computed(() => {
    const service = this.selectedService();
    return service ? service.price * this.travelers() * service.discount : 0;
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
    // El transporte independiente seleccionado para un servicio anterior no debe
    // arrastrarse a uno nuevo (menos aun si el nuevo servicio ya trae transporte incluido).
    this.transport.set('none');
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

  setCompanionName(index: number, value: string): void {
    const next = [...this.companionNames()];
    next[index] = value;
    this.companionNames.set(next);
  }

  setCompanionBirthDate(index: number, value: string): void {
    const next = [...this.companionBirthDates()];
    next[index] = value;
    this.companionBirthDates.set(next);
  }

  validate(form: HTMLFormElement): void {
    const service = this.selectedService();
    const isValid = Boolean(
      this.serviceReady() &&
        form.checkValidity() &&
        !this.lodgingOverCapacity() &&
        !this.transportOverCapacity() &&
        !this.duplicatedDocument(),
    );
    this.formValid.set(isValid);
    if (!service) this.feedback.set('Selecciona un servicio para consultar sus requisitos y valores.');
    else if (!this.dateWithinValidity() && this.departure()) this.feedback.set('La fecha seleccionada está fuera de la vigencia del servicio.');
    else if (this.lodgingOverCapacity()) this.feedback.set('La capacidad del hospedaje no cubre la cantidad total de viajeros.');
    else if (this.transportOverCapacity()) this.feedback.set('La capacidad del transporte no cubre la cantidad total de viajeros.');
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
    const data = new FormData(form);
    const holderName = String(data.get('holderName') || '').trim();
    const code = 'RES-1843';
    const projected = this.projected();
    const discount = this.discountValue();

    // Acompañantes individualizados (PDR RN-CLI-002/RN-RES-005): mientras el Backend solo
    // recibe partySize (BACKEND API FALTANTE — ACOMPAÑANTES), estos datos se conservan
    // localmente junto al resumen agregado ya usado por el resto de pantallas.
    const companionRecords: CompanionRecord[] = this.companionIndexes().map((index) => ({
      name: (this.companionNames()[index] || '').trim(),
      document: (this.companionDocuments()[index] || '').trim(),
      birthDate: this.companionBirthDates()[index] || '',
    }));
    const transportOption = this.selectedTransport();
    const transportSelected = transportOption
      ? this.serviceIncludesTransport()
        ? `Asociado al Tour — ${transportOption.name} (${transportOption.route})`
        : `${transportOption.name} — ${transportOption.route}`
      : undefined;

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
      holderDocument: this.holderDocument().trim(),
      companionRecords,
      transportSelected,
    });
    this.router.navigateByUrl('/operator/reservations/created');
  }
}
