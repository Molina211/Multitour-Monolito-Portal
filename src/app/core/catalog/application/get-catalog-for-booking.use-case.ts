import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CatalogApiService, CatalogItemResponse } from '../../catalog-api.service';

// Paso incremental de Arquitectura Hexagonal: agrupa "consultar un tour del catalogo por
// id" (GET .../catalog-items/{id}) bajo un caso de uso propio, mismo criterio que
// CreateReservationUseCase. Consumidores reales: ClientTourDetailComponent (ficha de
// tour) y ClientTourBookingComponent (datos del tour al iniciar una reserva) - ambos en el
// mismo flujo Cliente de consulta -> reserva del PDR Fase 1.
@Injectable({ providedIn: 'root' })
export class GetCatalogForBookingUseCase {
  private readonly catalogApi = inject(CatalogApiService);

  execute(tenantId: string, catalogItemId: string): Observable<CatalogItemResponse> {
    return this.catalogApi.getById(tenantId, catalogItemId);
  }
}
