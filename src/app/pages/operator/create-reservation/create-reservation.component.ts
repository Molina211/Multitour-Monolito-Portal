import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OperatorReservationService } from '../operator-reservation.service';

interface ServiceOption {
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

// Mismos servicios/valores/reglas ya confirmados en la landing aprobada (app.js: setupOperatorReservationForm).
const SERVICES: Record<string, ServiceOption> = {
  mountains: {
    name: 'Tour destino ejemplo - Montañas', price: 1299000, discount: 0.2, risk: false, lodgingCapacity: 2,
    departures: ['15 sep 2026', '22 sep 2026', '29 sep 2026'], payments: ['Transferencia', 'Efectivo', 'Abono'],
    inclusions: ['Alimentación incluida: plato del día', 'Transporte incluido: trayecto de ida y vuelta'],
    conditions: ['La modificación o cancelación depende de las condiciones vigentes del tour.', 'La disponibilidad y los valores se validan antes de registrar la reserva.'],
  },
  cenotes: {
    name: 'Aventura en cenotes ocultos', price: 520000, discount: 0, risk: false, lodgingCapacity: 2,
    departures: ['12 sep 2026', '19 sep 2026'], payments: ['Transferencia', 'Efectivo', 'Abono'],
    inclusions: ['Alimentación incluida: snack ligero', 'Transporte incluido: traslado al punto de salida'],
    conditions: ['La modificación o cancelación depende de las condiciones vigentes del tour.', 'La disponibilidad y los valores se validan antes de registrar la reserva.'],
  },
  rafting: {
    name: 'Rafting y acampada extrema', price: 799000, discount: 0, risk: true, lodgingCapacity: 2,
    departures: ['13 sep 2026', '27 sep 2026'], payments: ['Transferencia', 'Abono'],
    inclusions: ['Alimentación incluida: refrigerio de la actividad', 'Transporte incluido: traslado al punto de salida'],
    conditions: ['La actividad requiere requisitos de riesgo para cada viajero.', 'La modificación o cancelación depende de las condiciones vigentes del servicio.'],
  },
  cultural: {
    name: 'Recorrido cultural e histórico', price: 349000, discount: 0, risk: false, lodgingCapacity: 2,
    departures: ['16 sep 2026', '23 sep 2026', '30 sep 2026'], payments: ['Transferencia', 'Efectivo'],
    inclusions: ['Alimentación incluida: opción gastronómica del recorrido', 'Transporte incluido: trayecto programado'],
    conditions: ['La modificación o cancelación depende de las condiciones vigentes del servicio.', 'Los descuentos se aplican según la configuración comercial vigente.'],
  },
};

function normalizeDocument(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

@Component({
  selector: 'app-operator-create-reservation',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './create-reservation.component.html',
  styleUrl: './create-reservation.component.css',
})
export class CreateReservationComponent {
  private readonly reservationService = inject(OperatorReservationService);
  private readonly router = inject(Router);

  services = SERVICES;

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

  selectedService = computed(() => this.services[this.serviceKey()] || null);
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
