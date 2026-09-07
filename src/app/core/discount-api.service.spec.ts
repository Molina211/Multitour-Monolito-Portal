import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DiscountApiService, DiscountRequest, DiscountResponse } from './discount-api.service';
import { environment } from '../../environments/environment';

describe('DiscountApiService (contratos reales de discounts)', () => {
  let service: DiscountApiService;
  let httpMock: HttpTestingController;
  const tenantId = 'travesia-natural';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DiscountApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('create(): POST /tenants/{tenantId}/discounts con base "original" o "subtotal" (unicos valores reales)', () => {
    const request: DiscountRequest = {
      catalogItemId: 'c-1',
      percentage: 10,
      validFrom: '2026-09-01',
      validTo: '2026-12-31',
      base: 'subtotal',
    };

    service.create(tenantId, request).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/discounts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(['original', 'subtotal']).toContain(req.request.body.base);
    req.flush({} as DiscountResponse);
  });

  it('create(): propaga un error 400 cuando "base" es invalido segun el backend (IllegalArgumentException)', () => {
    let capturedStatus: number | undefined;
    service.create(tenantId, {} as DiscountRequest).subscribe({
      next: () => fail('no deberia emitir next'),
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/discounts`);
    req.flush({ message: 'invalid base' }, { status: 400, statusText: 'Bad Request' });

    expect(capturedStatus).toBe(400);
  });

  it('update(): PATCH /tenants/{tenantId}/discounts/{id} sin permitir editar catalogItemId (no existe en el contrato)', () => {
    service.update(tenantId, 'd-1', { percentage: 15 }).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/discounts/d-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ percentage: 15 });
    expect((req.request.body as Record<string, unknown>)['catalogItemId']).toBeUndefined();
    req.flush({} as DiscountResponse);
  });

  it('deactivate()/reactivate(): POST a la subruta real', () => {
    service.deactivate(tenantId, 'd-1').subscribe();
    const deactivateReq = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/discounts/d-1/deactivate`);
    expect(deactivateReq.request.method).toBe('POST');
    deactivateReq.flush({} as DiscountResponse);

    service.reactivate(tenantId, 'd-1').subscribe();
    const reactivateReq = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/discounts/d-1/reactivate`);
    expect(reactivateReq.request.method).toBe('POST');
    reactivateReq.flush({} as DiscountResponse);
  });
});
