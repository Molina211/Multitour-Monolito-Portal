import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ClientReservationService,
  normalizeClientReservationStatus,
} from '../client-reservation.service';
import { NEW_SERVICE_CATALOG_ID_BY_TYPE, OPERATOR_CATALOG_DEFAULTS, OperatorCatalogService } from '../../operator/operator-catalog.service';
import { OperatorDiscountService } from '../../operator/operator-discount.service';
import { ClientProfileService } from '../client-profile.service';
import { formatOperatorDate } from '../client-tour-catalog.service';

interface PromoCard {
  label: string;
  percentage: number;
  validUntil: string;
}

interface DestinationCard {
  key: string;
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

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.css',
})
export class ClientDashboardComponent implements OnInit {
  private readonly reservationService = inject(ClientReservationService);
  private readonly catalogService = inject(OperatorCatalogService);
  private readonly discountService = inject(OperatorDiscountService);
  private readonly clientProfileService = inject(ClientProfileService);

  // BUG corregido: esta pantalla es la PLANTILLA GENERICA multitenant. Antes se resolvia
  // "el primer tenant Activo configurado" en Plataforma, lo que en la practica mostraba el
  // nombre de CUALQUIER tenant creado ahi (ej. uno de prueba) como si fuera la identidad
  // real del cliente autenticado. No existe hoy una sesion de Cliente que indique a que
  // tenant especifico pertenece, asi que "adivinar" un tenant es tan incorrecto como
  // hardcodear uno fijo. Se mantiene el placeholder literal hasta que exista una sesion
  // real de Cliente con su tenant e identidad visual configurada.
  tenantName = computed(() => '[Tu Marca]');

  // Nombre del cliente actual: encapsulado en ClientProfileService (unico punto que conoce
  // la clave real de localStorage, multitour-user-profile), en vez de leer el storage
  // directamente desde el componente. BACKEND/SESION FALTANTE: sin autenticacion real, el
  // saludo depende de lo guardado en este navegador.
  greetingName = computed(() => {
    const firstName = String(this.clientProfileService.profile()?.name || '').trim().split(/\s+/)[0];
    return firstName || 'Fernanda';
  });

  // Accion rapida "Gastronomía": solo se ofrece si existen servicios de Alimentación
  // realmente activos y vigentes en el MISMO catalogo del Administrador (nunca datos demo
  // para mantenerla visible).
  hasActiveFood = computed(() => this.catalogService.activeCount('alimentacion-catalog-panel') > 0);

  ngOnInit(): void {
    void this.reservationService.refresh();
  }

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
      cards.push({ key: record.key, name: record.fields['name'] || record.key, tariff: record.fields['tariff'] || 'Por configurar' });
    }
    for (const resource of this.catalogService.newServices()) {
      if (resource.type !== 'tour') continue;
      if (!this.catalogService.isActive(NEW_SERVICE_CATALOG_ID_BY_TYPE['tour'], resource.id, resource.active)) continue;
      if (TODAY < resource.start || TODAY > resource.end) continue;
      cards.push({ key: resource.id, name: resource.name, tariff: `$${Math.round(resource.price).toLocaleString('es-CO')}` });
    }
    return cards;
  });
}
