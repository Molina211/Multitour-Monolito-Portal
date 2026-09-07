import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EstablishmentApiService, EstablishmentRequest, EstablishmentResponse } from './establishment-api.service';
import { environment } from '../../environments/environment';

// RN-ASO-001: Hotel asociado != Hospedaje reservable, Restaurante asociado != Alimentacion.
// Estas pruebas verifican que el contrato de "kind" siga siendo solo HOTEL/RESTAURANT
// (entidad comercial), sin mezclar con catalog-items (LODGING/FOOD).
describe('EstablishmentApiService (contratos reales de establishments)', () => {
  let service: EstablishmentApiService;
  let httpMock: HttpTestingController;
  const tenantId = 'travesia-natural';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EstablishmentApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listByTenant(): GET /tenants/{tenantId}/establishments', () => {
    let result: EstablishmentResponse[] | undefined;
    service.listByTenant(tenantId).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/establishments`);
    expect(req.request.method).toBe('GET');
    const response = [{ establishmentId: 'e-1', kind: 'HOTEL' } as EstablishmentResponse];
    req.flush(response);

    expect(result).toEqual(response);
  });

  it('create(): POST /tenants/{tenantId}/establishments con kind HOTEL o RESTAURANT unicamente', () => {
    const request: EstablishmentRequest = { kind: 'HOTEL', name: 'Hotel Central', description: null, image: null };

    service.create(tenantId, request).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/establishments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(['HOTEL', 'RESTAURANT']).toContain(req.request.body.kind);
    req.flush({} as EstablishmentResponse);
  });

  it('deactivate()/reactivate(): POST a la subruta real (nunca DELETE fisico)', () => {
    service.deactivate(tenantId, 'e-1').subscribe();
    const deactivateReq = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/establishments/e-1/deactivate`);
    expect(deactivateReq.request.method).toBe('POST');
    deactivateReq.flush({} as EstablishmentResponse);

    service.reactivate(tenantId, 'e-1').subscribe();
    const reactivateReq = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/establishments/e-1/reactivate`);
    expect(reactivateReq.request.method).toBe('POST');
    reactivateReq.flush({} as EstablishmentResponse);
  });

  it('listByTenant(): propaga un error 401 sin transformarlo', () => {
    let capturedStatus: number | undefined;
    service.listByTenant(tenantId).subscribe({
      next: () => fail('no deberia emitir next'),
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/establishments`);
    req.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(capturedStatus).toBe(401);
  });
});
