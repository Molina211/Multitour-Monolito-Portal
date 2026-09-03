import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OperatorReservationService, REFUND_PENDING_CALCULATION_LABEL } from '../operator-reservation.service';

function parseCOP(value: string | undefined): number {
  return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
}

function formatCOP(value: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(Math.round(value))}`;
}

interface CatalogService {
  key: string;
  name: string;
  price: number;
  discount: number;
  lodgingCapacity: number;
  departures: string[];
}

// Mismo catalogo de servicios ya aprobado en Crear reserva: no se inventan servicios,
// precios ni descuentos nuevos.
const SERVICES: CatalogService[] = [
  { key: 'mountains', name: 'Tour destino ejemplo - Montañas', price: 1299000, discount: 0.2, lodgingCapacity: 2, departures: ['15 sep 2026', '22 sep 2026', '29 sep 2026'] },
  { key: 'cenotes', name: 'Aventura en cenotes ocultos', price: 520000, discount: 0, lodgingCapacity: 2, departures: ['12 sep 2026', '19 sep 2026'] },
  { key: 'rafting', name: 'Rafting y acampada extrema', price: 799000, discount: 0, lodgingCapacity: 2, departures: ['13 sep 2026', '27 sep 2026'] },
  { key: 'cultural', name: 'Recorrido cultural e histórico', price: 349000, discount: 0, lodgingCapacity: 2, departures: ['16 sep 2026', '23 sep 2026', '30 sep 2026'] },
];

@Component({
  selector: 'app-operator-cancel-or-modify',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cancel-or-modify.component.html',
  styleUrl: './cancel-or-modify.component.css',
})
export class CancelOrModifyReservationComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reservationService = inject(OperatorReservationService);

  readonly code = this.route.snapshot.queryParamMap.get('reservation') || '';
  readonly reservation = this.reservationService.getReservation(this.code);
  readonly ineligible = Boolean(this.reservation) && !this.reservationService.isEligibleForCancelOrModify(this.reservation!.statusClass);
  readonly notFound = !this.reservation;
  // En ejecucion no se permiten ajustes ordinarios: solo cancelacion extraordinaria
  // por emergencia (RF-008A, linea 463/729, CA-008A).
  readonly isInExecution = this.reservation?.statusClass === 'is-execution';
  readonly paidValue = this.reservation ? parseCOP(this.reservation.paid) : 0;

  services = SERVICES;

  type = signal<'' | 'Cancelación' | 'Modificación'>(this.isInExecution ? 'Cancelación' : '');
  causal = signal('');
  done = signal(false);

  // Campos de "Modificación": mismo catalogo, mismos campos ya aprobados en Crear reserva.
  serviceKey = signal('');
  departure = signal('');
  travelers = signal(this.reservation?.travelers || 1);
  lodging = signal<'none' | 'mirador'>('none');

  feedback = signal(
    this.notFound
      ? 'No se encontró la reserva seleccionada.'
      : this.ineligible
        ? `Esta reserva está en estado "${this.reservation!.status}" y ya no admite cancelación o modificación.`
        : 'Completa la novedad para registrar la cancelación o modificación.',
  );
  feedbackIsValid = signal(false);

  disabled = computed(() => this.notFound || this.ineligible || this.done());
  isModification = computed(() => this.type() === 'Modificación');

  selectedService = computed(() => this.services.find((service) => service.key === this.serviceKey()) || null);

  projected = computed(() => {
    const service = this.selectedService();
    return service ? service.price * this.travelers() : 0;
  });
  discountValue = computed(() => {
    const service = this.selectedService();
    return service ? this.projected() * service.discount : 0;
  });
  finalValue = computed(() => this.projected() - this.discountValue());
  balanceValue = computed(() => Math.max(this.finalValue() - this.paidValue, 0));

  projectedLabel = computed(() => formatCOP(this.projected()));
  discountLabel = computed(() => (this.discountValue() ? `-${formatCOP(this.discountValue())}` : '$0'));
  finalLabel = computed(() => formatCOP(this.finalValue()));
  balanceLabel = computed(() => formatCOP(this.balanceValue()));

  lodgingOverCapacity = computed(() => {
    const service = this.selectedService();
    return this.lodging() !== 'none' && !!service && this.travelers() > service.lodgingCapacity;
  });

  // "Pendiente de calculo": no existe en el PDR ninguna formula o tabla parametrizada
  // para el valor de devolucion (verificado en la fuente); solo se declara SI existe un
  // valor a favor potencial (pagado > nuevo valor final, o cancelacion con pago > $0).
  potentialLabel = computed(() => {
    if (this.type() === 'Cancelación') {
      return this.paidValue > 0 ? REFUND_PENDING_CALCULATION_LABEL : 'No aplica: no hay pagos registrados en esta reserva.';
    }
    if (this.type() === 'Modificación') {
      if (!this.selectedService()) return 'Selecciona el nuevo servicio para calcular el saldo resultante.';
      return this.finalValue() < this.paidValue ? REFUND_PENDING_CALCULATION_LABEL : 'No aplica: el valor final no queda por debajo de lo ya pagado.';
    }
    return '';
  });

  onServiceChange(value: string): void {
    this.serviceKey.set(value);
    this.departure.set('');
  }

  onTravelersChange(value: string): void {
    this.travelers.set(Math.max(1, Number.parseInt(value, 10) || 1));
  }

  register(): void {
    if (this.disabled() || !this.reservation) return;
    const type = this.type();
    const causal = this.causal().trim();
    if (!type || !causal) {
      this.feedback.set('Completa el tipo y la causal de la cancelación o modificación.');
      this.feedbackIsValid.set(false);
      return;
    }
    if (this.isInExecution && type !== 'Cancelación') {
      this.feedback.set('Esta reserva está en ejecución: solo se permite registrar una cancelación extraordinaria por emergencia.');
      this.feedbackIsValid.set(false);
      return;
    }

    let hasPotentialRefund: boolean;

    if (type === 'Cancelación') {
      hasPotentialRefund = this.paidValue > 0;
    } else {
      const service = this.selectedService();
      if (!service || !this.departure()) {
        this.feedback.set('Selecciona el nuevo servicio y la nueva fecha de salida para registrar la modificación.');
        this.feedbackIsValid.set(false);
        return;
      }
      if (this.lodgingOverCapacity()) {
        this.feedback.set('La capacidad del hospedaje no cubre la cantidad total de viajeros.');
        this.feedbackIsValid.set(false);
        return;
      }
      this.reservationService.registerModification(this.code, {
        service: service.name,
        date: this.departure(),
        travelers: this.travelers(),
        companions: `${Math.max(0, this.travelers() - 1)} registrado(s)`,
        projected: this.projectedLabel(),
        discount: this.discountLabel(),
        final: this.finalLabel(),
        balance: this.balanceLabel(),
        causal,
      });
      hasPotentialRefund = this.finalValue() < this.paidValue;
    }

    this.reservationService.registerCancelOrModify(this.code, type, causal, hasPotentialRefund);
    if (hasPotentialRefund) {
      this.feedback.set(
        type === 'Cancelación'
          ? 'Cancelación registrada. El valor a devolver queda pendiente de cálculo según la condición comercial parametrizada; podrás gestionarlo desde el detalle de la reserva.'
          : 'Modificación registrada y valores recalculados. El valor a favor queda pendiente de cálculo según la condición comercial parametrizada.',
      );
    } else {
      this.feedback.set(
        type === 'Cancelación'
          ? 'Cancelación registrada: no hay pagos registrados, no se genera solicitud de devolución.'
          : 'Modificación registrada y valores recalculados.',
      );
    }
    this.feedbackIsValid.set(true);
    this.done.set(true);
    window.setTimeout(() => {
      this.router.navigate(['/operator/reservations/detail'], { queryParams: { reservation: this.code } });
    }, 1400);
  }
}
