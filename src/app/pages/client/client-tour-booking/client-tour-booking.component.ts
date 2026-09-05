import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientTourCatalogService, ClientTourOption, formatOperatorDate } from '../client-tour-catalog.service';
import { ClientReservationService, CompanionRecord } from '../client-reservation.service';

function normalizeDocument(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

// Misma fecha de referencia ya usada/aprobada en el resto del Portal
// (operator-reservation.service.ts / client-dashboard.component.ts), zona America/Bogota.
function getTenantToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

@Component({
  selector: 'app-client-tour-booking',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-tour-booking.component.html',
  styleUrl: './client-tour-booking.component.css',
})
export class ClientTourBookingComponent {
  private readonly tourCatalogService = inject(ClientTourCatalogService);
  private readonly reservationService = inject(ClientReservationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  tenantName = computed(() => '[Tu Marca]');

  readonly tourKey = this.route.snapshot.queryParamMap.get('tour') || '';
  tour = computed<ClientTourOption | null>(() => this.tourCatalogService.getActiveTourService(this.tourKey));

  today = getTenantToday();

  departure = signal('');
  travelers = signal(1);
  holderName = signal('');
  holderDocument = signal('');
  companionNames = signal<string[]>([]);
  companionDocuments = signal<string[]>([]);
  companionBirthDates = signal<string[]>([]);
  conditionsAccepted = signal(false);
  paymentMethod = signal('');
  depositAmount = signal(0);
  feedback = signal('Selecciona la fecha del servicio y completa los datos para continuar.');
  feedbackIsValid = signal(false);

  requiredCompanions = computed(() => Math.max(0, this.travelers() - 1));
  companionIndexes = computed(() => Array.from({ length: this.requiredCompanions() }, (_, index) => index));

  // Cupo maximo reservable: el del servicio (cuando esta parametrizado) y, si tiene
  // transporte asociado, tambien el de ese transporte — el MENOR de ambos aplica (ej. Tour
  // permite 60 y transporte permite 50 => maximo 50).
  maxTravelers = computed(() => {
    const tour = this.tour();
    if (!tour) return Infinity;
    const byService = tour.capacity != null ? tour.capacity : Infinity;
    const byTransport = tour.associatedTransport?.capacity != null ? tour.associatedTransport.capacity : Infinity;
    return Math.min(byService, byTransport);
  });
  hasCapacity = computed(() => this.travelers() <= this.maxTravelers());

  // CORRECCION PDR v1.7.1: la fecha del servicio se valida contra su vigencia de oferta
  // (activo + rango de fechas, ambas fechas inclusive), nunca contra una lista de salidas
  // parametrizadas aparte.
  dateWithinValidity = computed(() => {
    const tour = this.tour();
    const date = this.departure();
    return Boolean(tour && date && date >= tour.start && date <= tour.end);
  });

  duplicatedDocument = computed(() => {
    const docs = [this.holderDocument(), ...this.companionDocuments()].map(normalizeDocument).filter(Boolean);
    return docs.some((doc, index) => docs.indexOf(doc) !== index);
  });

  projected = computed(() => {
    const tour = this.tour();
    return tour ? tour.price * this.travelers() : 0;
  });
  discountValue = computed(() => {
    const tour = this.tour();
    return tour ? tour.price * this.travelers() * tour.discount : 0;
  });
  finalValue = computed(() => this.projected() - this.discountValue());

  projectedLabel = computed(() => formatCurrency(this.projected()));
  discountLabel = computed(() => (this.discountValue() ? `-${formatCurrency(this.discountValue())}` : '$0'));
  finalLabel = computed(() => formatCurrency(this.finalValue()));

  startLabel = computed(() => formatOperatorDate(this.tour()?.start));
  endLabel = computed(() => formatOperatorDate(this.tour()?.end));

  setDeparture(value: string): void {
    this.departure.set(value);
  }

  onTravelersChange(value: string): void {
    this.travelers.set(Math.max(1, Number.parseInt(value, 10) || 1));
  }

  setHolderName(value: string): void {
    this.holderName.set(value);
  }
  setHolderDocument(value: string): void {
    this.holderDocument.set(value);
  }
  setCompanionName(index: number, value: string): void {
    const next = [...this.companionNames()];
    next[index] = value;
    this.companionNames.set(next);
  }
  setCompanionDocument(index: number, value: string): void {
    const next = [...this.companionDocuments()];
    next[index] = value;
    this.companionDocuments.set(next);
  }
  setCompanionBirthDate(index: number, value: string): void {
    const next = [...this.companionBirthDates()];
    next[index] = value;
    this.companionBirthDates.set(next);
  }

  // Requisitos de actividad de riesgo (RN-597): un set de campos por persona (titular +
  // acompañantes), solo cuando el servicio esta marcado como actividad de riesgo.
  riskBlood = signal<string[]>([]);
  riskEmergency = signal<string[]>([]);
  riskRestrictions = signal<string[]>([]);
  riskConsent = signal<boolean[]>([]);
  peopleCount = computed(() => 1 + this.requiredCompanions());
  peopleIndexes = computed(() => Array.from({ length: this.peopleCount() }, (_, index) => index));
  peopleLabels = computed(() => ['Titular', ...this.companionIndexes().map((index) => `Acompañante ${index + 1}`)]);

  setRiskBlood(index: number, value: string): void {
    const next = [...this.riskBlood()];
    next[index] = value;
    this.riskBlood.set(next);
  }
  setRiskEmergency(index: number, value: string): void {
    const next = [...this.riskEmergency()];
    next[index] = value;
    this.riskEmergency.set(next);
  }
  setRiskRestrictions(index: number, value: string): void {
    const next = [...this.riskRestrictions()];
    next[index] = value;
    this.riskRestrictions.set(next);
  }
  setRiskConsent(index: number, value: boolean): void {
    const next = [...this.riskConsent()];
    next[index] = value;
    this.riskConsent.set(next);
  }
  riskComplete = computed(() => {
    const tour = this.tour();
    if (!tour?.risk) return true;
    for (let index = 0; index < this.peopleCount(); index += 1) {
      if (!this.riskBlood()[index]?.trim() || !this.riskEmergency()[index]?.trim() || !this.riskRestrictions()[index]?.trim() || !this.riskConsent()[index]) {
        return false;
      }
    }
    return true;
  });

  onDepositAmountChange(value: string): void {
    this.depositAmount.set(Number(value) || 0);
  }

  validate(): boolean {
    const tour = this.tour();
    if (!tour) {
      this.feedback.set('Este tour ya no está activo, vigente, o no existe.');
      this.feedbackIsValid.set(false);
      return false;
    }
    if (!this.dateWithinValidity()) {
      this.feedback.set(`Selecciona una fecha entre ${this.startLabel()} y ${this.endLabel()}.`);
      this.feedbackIsValid.set(false);
      return false;
    }
    if (!this.hasCapacity()) {
      this.feedback.set(`La cantidad seleccionada supera la capacidad disponible (${this.maxTravelers()} viajeros).`);
      this.feedbackIsValid.set(false);
      return false;
    }
    if (!this.holderName().trim() || !this.holderDocument().trim()) {
      this.feedback.set('Completa el nombre y documento del titular.');
      this.feedbackIsValid.set(false);
      return false;
    }
    for (const index of this.companionIndexes()) {
      if (!this.companionNames()[index]?.trim() || !this.companionDocuments()[index]?.trim() || !this.companionBirthDates()[index]) {
        this.feedback.set('Completa los datos de todos los acompañantes.');
        this.feedbackIsValid.set(false);
        return false;
      }
    }
    if (this.duplicatedDocument()) {
      this.feedback.set('El documento del titular y los acompañantes debe ser único dentro de la reserva.');
      this.feedbackIsValid.set(false);
      return false;
    }
    if (!this.riskComplete()) {
      this.feedback.set('Completa los requisitos de actividad de riesgo para cada viajero.');
      this.feedbackIsValid.set(false);
      return false;
    }
    if (!this.conditionsAccepted()) {
      this.feedback.set('Debes aceptar las condiciones aplicables para continuar.');
      this.feedbackIsValid.set(false);
      return false;
    }
    if (!this.paymentMethod()) {
      this.feedback.set('Selecciona una modalidad de pago.');
      this.feedbackIsValid.set(false);
      return false;
    }
    if (this.paymentMethod() === 'Abono' && (!this.depositAmount() || this.depositAmount() <= 0 || this.depositAmount() > this.finalValue())) {
      this.feedback.set('Ingresa un monto de abono válido (mayor a cero y hasta el valor final).');
      this.feedbackIsValid.set(false);
      return false;
    }
    this.feedback.set('La reserva cumple las validaciones y está lista para registrarse.');
    this.feedbackIsValid.set(true);
    return true;
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.validate()) return;

    const tour = this.tour();
    if (!tour) return;

    const companions: CompanionRecord[] = this.companionIndexes().map((index) => ({
      name: (this.companionNames()[index] || '').trim(),
      document: (this.companionDocuments()[index] || '').trim(),
      birthDate: this.companionBirthDates()[index] || '',
    }));
    const code = `#RES-${Date.now().toString().slice(-6)}`;
    const projected = this.projected();
    const discount = this.discountValue();
    const finalValue = this.finalValue();
    const transportSelected = tour.associatedTransport ? `${tour.associatedTransport.name} — ${tour.associatedTransport.route}` : '';

    // PDR v1.7.1 (lineas 628-630): ninguna modalidad confirma la reserva automaticamente al
    // crearla. Transferencia requiere soporte + validacion operativa; Efectivo requiere
    // condicion parametrizada o dinero recibido; Abono requiere el abono minimo
    // parametrizado. Sin esas condiciones cumplidas aqui, la reserva queda Pendiente de pago.
    const base = {
      code,
      experience: tour.name,
      startDate: formatOperatorDate(this.departure()),
      endDate: formatOperatorDate(this.departure()),
      travelers: String(this.travelers()),
      status: 'Pendiente de pago',
      budget: formatCurrency(finalValue),
      projectedValue: formatCurrency(projected),
      discountValue: discount ? `-${formatCurrency(discount)}` : '$0',
      finalValue: formatCurrency(finalValue),
      tourKey: this.tourKey,
      savedAt: this.today,
      holderDocument: this.holderDocument().trim(),
      companions,
      transportSelected,
      method: this.paymentMethod(),
    };

    if (this.paymentMethod() === 'Abono') {
      this.reservationService.recordReservation({
        ...base,
        paymentStatus: 'Parcial',
        paid: formatCurrency(this.depositAmount()),
        balance: formatCurrency(finalValue - this.depositAmount()),
        paymentHistory: [{ amount: this.depositAmount(), date: new Date().toISOString() }],
      });
      this.router.navigateByUrl('/client/reservations');
      return;
    }

    if (this.paymentMethod() === 'Efectivo') {
      this.reservationService.recordReservation({ ...base, paymentStatus: 'Sin pago' });
      this.router.navigateByUrl('/client/reservations');
      return;
    }

    // Transferencia: se registra "Sin pago" y se dirige a la pantalla de pago para ver
    // instrucciones, datos bancarios y subir el comprobante (sin confirmar automaticamente).
    this.reservationService.recordReservation({ ...base, paymentStatus: 'Sin pago' });
    this.router.navigateByUrl('/client/reservations/payment');
  }
}
