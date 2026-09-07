import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AssociatedEstablishment, OperatorCatalogService } from '../../operator/operator-catalog.service';

// Mismo catalogId ya usado en Landing (app.js: OPERATOR_ASSOCIATED_ESTABLISHMENTS_CATALOG_ID)
// para el mapa generico de activo/inactivo (isActive), sin crear un mecanismo paralelo.
const ASSOCIATED_ESTABLISHMENTS_CATALOG_ID = 'associated-establishments';

@Component({
  selector: 'app-client-gastronomy-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './client-gastronomy-detail.component.html',
  styleUrl: './client-gastronomy-detail.component.css',
})
export class ClientGastronomyDetailComponent {
  private readonly catalogService = inject(OperatorCatalogService);
  private readonly route = inject(ActivatedRoute);

  tenantName = computed(() => '[Tu Marca]');

  private readonly establishmentId = this.route.snapshot.queryParamMap.get('id') || '';
  private readonly sourceKey = this.route.snapshot.queryParamMap.get('source') || 'gastronomy';

  readonly backHref = this.sourceKey === 'restaurants' ? '/client/gastronomy/restaurants' : '/client/gastronomy';
  readonly backLabel = this.sourceKey === 'restaurants' ? 'Volver a restaurantes' : 'Volver a gastronomía';

  // BUG corregido (mismo criterio ya aplicado en Landing: detalle-gastronomia.html): busca el
  // establecimiento REAL por id; si no existe o ya no esta activo, se informa en vez de
  // inventar uno. No hay rating/reseñas/menu/"Precio promedio" en el modelo de establecimiento
  // asociado, por lo que esta pantalla solo muestra nombre, imagen y descripción.
  readonly establishment = computed<AssociatedEstablishment | null>(
    () =>
      this.catalogService
        .establishments()
        .find(
          (item) =>
            item.id === this.establishmentId &&
            item.kind === 'restaurant' &&
            this.catalogService.isActive(ASSOCIATED_ESTABLISHMENTS_CATALOG_ID, item.id, true),
        ) || null,
  );
}
