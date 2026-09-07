import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogApiService, CatalogItemRequest, CatalogItemResponse } from './catalog-api.service';
import { environment } from '../../environments/environment';

describe('CatalogApiService (contratos reales de catalog-items)', () => {
  let service: CatalogApiService;
  let httpMock: HttpTestingController;
  const tenantId = 'travesia-natural';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CatalogApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listByTenant(): GET /tenants/{tenantId}/catalog-items con el tenantId real en la URL', () => {
    let result: CatalogItemResponse[] | undefined;
    service.listByTenant(tenantId).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/catalog-items`);
    expect(req.request.method).toBe('GET');
    const response = [{ catalogItemId: 'c-1' } as CatalogItemResponse];
    req.flush(response);

    expect(result).toEqual(response);
  });

  it('create(): POST /tenants/{tenantId}/catalog-items con el request exacto (mismo type/campos, sin inventar)', () => {
    const request: CatalogItemRequest = {
      type: 'TOUR',
      name: 'Tour laguna',
      price: 250000,
      capacity: 10,
      restrictions: null,
      validFrom: '2026-09-01',
      validTo: '2026-12-31',
      policy: null,
      image: null,
      route: null,
      operationalCost: null,
    };

    service.create(tenantId, request).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/catalog-items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({} as CatalogItemResponse);
  });

  it('update(): PATCH /tenants/{tenantId}/catalog-items/{id} solo con los campos provistos (semantica parcial real)', () => {
    service.update(tenantId, 'c-1', { price: 300000 }).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/catalog-items/c-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ price: 300000 });
    req.flush({} as CatalogItemResponse);
  });

  it('deactivate()/reactivate(): POST a la subruta real, sin eliminar fisicamente (RN catalogo: solo inactivar/reactivar)', () => {
    service.deactivate(tenantId, 'c-1').subscribe();
    const deactivateReq = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/catalog-items/c-1/deactivate`);
    expect(deactivateReq.request.method).toBe('POST');
    deactivateReq.flush({} as CatalogItemResponse);

    service.reactivate(tenantId, 'c-1').subscribe();
    const reactivateReq = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/catalog-items/c-1/reactivate`);
    expect(reactivateReq.request.method).toBe('POST');
    reactivateReq.flush({} as CatalogItemResponse);
  });

  it('create(): propaga un error 409 del backend sin transformarlo (p.ej. operador inactivo)', () => {
    let capturedStatus: number | undefined;
    service.create(tenantId, {} as CatalogItemRequest).subscribe({
      next: () => fail('no deberia emitir next'),
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/catalog-items`);
    req.flush({ message: 'conflict' }, { status: 409, statusText: 'Conflict' });

    expect(capturedStatus).toBe(409);
  });
});
