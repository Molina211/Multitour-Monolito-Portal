import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ClientReservationService,
  normalizeClientReservationStatus,
} from '../client-reservation.service';
import { NEW_SERVICE_CATALOG_ID_BY_TYPE, OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../../operator/operator-catalog.service';
import { OperatorDiscountService } from '../../operator/operator-discount.service';
import { PlatformDataService } from '../../platform/platform-data.service';

interface PromoCard {
  label: string;
  percentage: number;
  validUntil: string;
}

interface DestinationCard {
  name: string;
  tariff: string;
}

const TOUR_CATALOG_ID = 'catalogo-catalog-panel';
// Misma fecha de referencia ya usada/aprobada en el resto del Portal (operator-reservation.service.ts).
const TODAY = '2026-09-01';
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function parseCatalogDate(text: string | undefined): string {
  const match = /^(\d{1,2})\s+([a-z]{3})\s+(\d{4})$/i.exec((text || '').trim());
  if (!match) return '';
  const monthIndex = MONTH_ABBR.indexOf(match[2].toLowerCase());
  if (monthIndex === -1) return '';
  return `${match[3]}-${String(monthIndex + 1).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function formatOperatorDate(iso: string | undefined): string {
  const [year, month, day] = (iso || '').split('-');
  const monthName = MONTH_ABBR[Number(month) - 1];
  if (!year || !day || !monthName) return iso || '';
  return `${day} ${monthName} ${year}`;
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.css',
})
export class ClientDashboardComponent {
  private readonly reservationService = inject(ClientReservationService);
  private readonly catalogService = inject(OperatorCatalogService);
  private readonly discountService = inject(OperatorDiscountService);
  private readonly platformService = inject(PlatformDataService);

  // Identidad visual del tenant (PDR: nombre configurado, o "Multitour" por defecto). No
  // existe hoy una sesion real de Cliente que indique su tenant especifico: se usa el
  // primer tenant Activo configurado (mismo mecanismo local de Plataforma), o el nombre
  // predeterminado si no hay ninguno. BACKEND/SESION FALTANTE: sin sesion de Cliente real
  // no es posible resolver el tenant exacto de forma definitiva.
  tenantName = computed(() => this.platformService.tenants().find((tenant) => tenant.status === 'Activo')?.name || 'Multitour');

  activeReservation = computed(() => this.reservationService.activeReservation());
  activeReservationStatus = computed(() => {
    const reservation = this.activeReservation();
    return reservation ? normalizeClientReservationStatus(reservation.status) : null;
  });

  // "Continuar pago" solo aparece cuando existe una reserva propia realmente pendiente de
  // pago (CASO A/B): nunca como decoracion fija sin importar el estado real.
  showContinuePayment = computed(() => this.activeReservationStatus() === 'Pendiente de pago');

  // Descuentos vigentes (RF-005A): misma fuente real que Descuentos del Administrador
  // (OperatorDiscountService), filtrando solo activos y dentro de vigencia hoy.
  promos = computed<PromoCard[]>(() =>
    this.discountService
      .discounts()
      .filter((discount) => discount.active && (!discount.start || discount.start <= TODAY) && (!discount.end || discount.end >= TODAY))
      .map((discount) => ({
        label: discount.serviceLabel || discount.service,
        percentage: discount.percentage,
        validUntil: discount.end ? `Válido hasta ${formatOperatorDate(discount.end)}` : 'Vigencia activa',
      })),
  );

  // Experiencias destacadas (RF-004): misma fuente real que Catálogos del Administrador
  // (OperatorCatalogService), filtrando solo tours activos y dentro de su vigencia hoy.
  // Nunca una segunda lista hardcodeada distinta al catalogo real.
  destinations = computed<DestinationCard[]>(() => {
    const cards: DestinationCard[] = [];
    for (const record of OPERATOR_CATALOG_DEFAULTS[TOUR_CATALOG_ID].records) {
      if (!this.catalogService.isActive(TOUR_CATALOG_ID, record.key, record.active)) continue;
      const [startText, endText] = (record.fields['validity'] || '').split(' - ');
      const start = parseCatalogDate(startText);
      const end = parseCatalogDate(endText) || start;
      if (!start || TODAY < start || TODAY > end) continue;
      cards.push({ name: record.fields['name'] || record.key, tariff: record.fields['tariff'] || 'Por configurar' });
    }
    for (const resource of this.catalogService.newServices()) {
      if (resource.type !== 'tour') continue;
      if (!this.catalogService.isActive(NEW_SERVICE_CATALOG_ID_BY_TYPE['tour'], resource.id, resource.active)) continue;
      if (TODAY < resource.start || TODAY > resource.end) continue;
      cards.push({ name: resource.name, tariff: `$${Math.round(resource.price).toLocaleString('es-CO')}` });
    }
    return cards;
  });
}
