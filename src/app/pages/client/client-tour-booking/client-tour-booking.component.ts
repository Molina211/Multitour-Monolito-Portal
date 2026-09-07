import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DEFAULT_TOUR_PAYMENT_METHODS, GENERIC_TOUR_CONDITION, formatOperatorDate } from '../client-tour-catalog.service';
import { ClientReservationService, CompanionRecord } from '../client-reservation.service';
import { CatalogApiService, CatalogItemResponse } from '../../../core/catalog-api.service';
import { GetCatalogForBookingUseCase } from '../../../core/catalog/application/get-catalog-for-booking.use-case';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../../core/http-error.util';
import { formatCOP } from '../../../core/money.util';
import { PAYMENT_METHOD_FROM_LABEL } from '../../../core/payment-api.service';
import { CreateReservationUseCase } from '../../../core/reservation/application/create-reservation.use-case';
import { RegisterReservationPaymentUseCase } from '../../../core/reservation/application/register-reservation-payment.use-case';
import { SessionService } from '../../../core/session.service';

function normalizeDocument(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

const formatCurrency = formatCOP;

const PAYMENT_METHOD_TO_BACKEND = PAYMENT_METHOD_FROM_LABEL;

// BLOQUEO/INCOMPATIBILIDAD (Fase 10): CatalogItemResponse.java NO tiene "risk" (actividad
// de riesgo), "payments" (medios de pago por tour) ni "conditions" (condiciones por tour) -
// esos campos solo existian en el mock local (KNOWN_TOUR_DETAILS). Con el catalogo real:
// - la seccion de "Requisitos de actividad de riesgo" queda deshabilitada para todos los
//   tours (no hay forma de saber desde la API cuales son de riesgo);
// - se muestran los 3 medios de pago reales validos (Transferencia/Efectivo/Abono) para
//   cualquier tour, en vez de una lista distinta por tour;
// - las condiciones muestran la "policy" real del tour (o un texto generico si no tiene).
// Tampoco existe "discount" en este contrato: el descuento se aplica aparte, despues de
// crear la reserva, via POST .../apply-discount (Fase 12, exclusivo de Administrador) - no
// se inventa un descuento automatico al crear.
interface BookingTour {
  catalogItemId: string;
  name: string;
  price: number;
  capacity: number | null;
  start: string;
  end: string;
  policy: string | null;
}

@Component({
  selector: 'app-client-tour-booking',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-tour-booking.component.html',
  styleUrl: './client-tour-booking.component.css',
})
export class ClientTourBookingComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly getCatalogForBooking = inject(GetCatalogForBookingUseCase);
  private readonly createReservation = inject(CreateReservationUseCase);
  private readonly registerReservationPayment = inject(RegisterReservationPaymentUseCase);
  private readonly reservationService = inject(ClientReservationService);
  private readonly sessionService = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  tenantName = computed(() => '[Tu Marca]');

  readonly tourKey = this.route.snapshot.queryParamMap.get('tour') || '';
  loading = signal(true);
  tour = signal<BookingTour | null>(null);
  transportOptions = signal<CatalogItemResponse[]>([]);
  selectedTransportItemId = signal('');

  today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

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
  submitting = signal(false);

  // Medios de pago y condicion: reales pero genericos (ver BLOQUEO arriba). "risk" ya no
  // existe en datos reales, asi que la seccion de riesgo nunca se activa.
  paymentOptions = DEFAULT_TOUR_PAYMENT_METHODS;
  conditions = computed(() => [this.tour()?.policy || GENERIC_TOUR_CONDITION]);

  requiredCompanions = computed(() => Math.max(0, this.travelers() - 1));
  companionIndexes = computed(() => Array.from({ length: this.requiredCompanions() }, (_, index) => index));

  maxTravelers = computed(() => this.tour()?.capacity ?? Infinity);
  hasCapacity = computed(() => this.travelers() <= this.maxTravelers());

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
  finalValue = this.projected;

  projectedLabel = computed(() => formatCurrency(this.projected()));
  finalLabel = computed(() => formatCurrency(this.finalValue()));

  startLabel = computed(() => formatOperatorDate(this.tour()?.start));
  endLabel = computed(() => formatOperatorDate(this.tour()?.end));

  ngOnInit(): void {
    const tenantId = this.sessionService.tenantId();
    if (!tenantId || !this.tourKey) {
      this.loading.set(false);
      return;
    }
    forkJoin({
      tour: this.getCatalogForBooking.execute(tenantId, this.tourKey),
      catalog: this.catalogApi.listByTenant(tenantId),
    }).subscribe({
      next: ({ tour, catalog }) => {
        if (tour.type === 'TOUR' && tour.active) {
          this.tour.set({
            catalogItemId: tour.catalogItemId,
            name: tour.name,
            price: tour.price,
            capacity: tour.capacity,
            start: tour.validFrom || '',
            end: tour.validTo || '',
            policy: tour.policy,
          });
        }
        this.transportOptions.set(catalog.filter((item) => item.type === 'TRANSPORT' && item.active));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

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
    const tenantId = this.sessionService.tenantId();
    if (!tour || !tenantId) return;

    const companions: CompanionRecord[] = this.companionIndexes().map((index) => ({
      name: (this.companionNames()[index] || '').trim(),
      document: (this.companionDocuments()[index] || '').trim(),
      birthDate: this.companionBirthDates()[index] || '',
    }));

    this.submitting.set(true);
    this.feedback.set('Creando reserva...');

    this.createReservation
      .execute(tenantId, {
        projectedValue: this.projected(),
        reservedServices: [
          {
            serviceReference: tour.catalogItemId,
            partySize: this.travelers(),
            scheduledDate: this.departure(),
            transportItemId: this.selectedTransportItemId() || null,
          },
        ],
        holderDocument: this.holderDocument().trim(),
        companions,
      })
      .subscribe({
        next: (reservation) => this.afterCreate(tenantId, reservation.reservationId),
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.feedback.set(this.mapCreateError(err));
          this.feedbackIsValid.set(false);
        },
      });
  }

  private afterCreate(tenantId: string, reservationId: string): void {
    const method = this.paymentMethod();
    const backendMethod = PAYMENT_METHOD_TO_BACKEND[method];

    // Transferencia: la reserva se crea "Pendiente de pago"; el comprobante y el registro
    // del pago se hacen en la pantalla siguiente (client-reservation-payment, Fase 13).
    if (method === 'Transferencia' || !backendMethod) {
      this.submitting.set(false);
      this.router.navigateByUrl('/client/reservations/payment');
      return;
    }

    const amount = method === 'Abono' ? this.depositAmount() : this.finalValue();
    this.registerReservationPayment
      .execute(tenantId, reservationId, { method: backendMethod, amount, supportReference: null })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.router.navigateByUrl('/client/reservations');
        },
        error: () => {
          // La reserva ya quedo creada; el pago se puede intentar de nuevo desde Mis reservas.
          this.submitting.set(false);
          this.router.navigateByUrl('/client/reservations');
        },
      });
  }

  private mapCreateError(error: HttpErrorResponse): string {
    if (error.status === 401 || error.status === 403) return 'Tu sesión no permite crear esta reserva.';
    if (error.status === 400) return error.error?.message || 'Revisa los datos ingresados.';
    if (error.status === 409) return 'El operador está inactivo; no admite nuevas reservas.';
    if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
    return 'No fue posible crear la reserva.';
  }
}
