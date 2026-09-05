import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClientTourCatalogService, ClientTourOption, formatOperatorDate } from '../client-tour-catalog.service';

@Component({
  selector: 'app-client-tour-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './client-tour-detail.component.html',
  styleUrl: './client-tour-detail.component.css',
})
export class ClientTourDetailComponent {
  private readonly tourCatalogService = inject(ClientTourCatalogService);
  private readonly route = inject(ActivatedRoute);

  tenantName = computed(() => '[Tu Marca]');

  readonly tourKeyParam = this.route.snapshot.queryParamMap.get('tour') || '';

  // BUG corregido (pantalla nueva): se resuelve SIEMPRE desde el catalogo real (activo +
  // vigente); si el tour no existe o ya no esta activo/vigente, se informa en vez de
  // inventar uno de relleno.
  tour = computed<ClientTourOption | null>(() => this.tourCatalogService.getActiveTourService(this.tourKeyParam));

  finalPrice = computed(() => {
    const tour = this.tour();
    return tour ? tour.price * (1 - tour.discount) : 0;
  });

  startLabel = computed(() => formatOperatorDate(this.tour()?.start));
  endLabel = computed(() => formatOperatorDate(this.tour()?.end));
}
