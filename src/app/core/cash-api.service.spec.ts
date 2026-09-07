import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  CashApiService,
  CashRegisterResponse,
  OpenCashRegisterRequest,
  RegisterCashMovementRequest,
} from './cash-api.service';
import { environment } from '../../environments/environment';

describe('CashApiService (contratos reales de caja)', () => {
  let service: CashApiService;
  let httpMock: HttpTestingController;
  const tenantId = 'travesia-natural';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CashApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('open(): POST /tenants/{tenantId}/cash con businessDate/baseAmount/actorId reales', () => {
    const request: OpenCashRegisterRequest = { businessDate: '2026-09-06', baseAmount: 50000, actorId: 'membership-1' };

    service.open(tenantId, request).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/cash`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({} as CashRegisterResponse);
  });

  it('registerMovement(): POST .../cash/{cashRegisterId}/movements con type uno de los 3 valores reales en espanol', () => {
    const request: RegisterCashMovementRequest = {
      type: 'Ingreso',
      amount: 100000,
      concept: 'Pago reserva',
      actorId: 'membership-1',
    };

    service.registerMovement(tenantId, 'caja-1', request).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/cash/caja-1/movements`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(['Ingreso', 'Pago operacional', 'Gasto']).toContain(req.request.body.type);
    req.flush({} as CashRegisterResponse);
  });

  it('close(): POST .../cash/{cashRegisterId}/close con actorId', () => {
    service.close(tenantId, 'caja-1', { actorId: 'membership-1' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/cash/caja-1/close`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ actorId: 'membership-1' });
    req.flush({} as CashRegisterResponse);
  });

  it('getByBusinessDate(): GET /tenants/{tenantId}/cash con businessDate como query param', () => {
    service.getByBusinessDate(tenantId, '2026-09-06').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/tenants/${tenantId}/cash` && r.params.get('businessDate') === '2026-09-06',
    );
    expect(req.request.method).toBe('GET');
    req.flush({} as CashRegisterResponse);
  });

  it('getMonthlyConsolidation(): GET .../cash/consolidation con period como query param', () => {
    service.getMonthlyConsolidation(tenantId, '2026-09').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/tenants/${tenantId}/cash/consolidation` && r.params.get('period') === '2026-09',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('open(): propaga un error 409 cuando ya existe una caja abierta para ese businessDate', () => {
    let capturedStatus: number | undefined;
    service.open(tenantId, {} as OpenCashRegisterRequest).subscribe({
      next: () => fail('no deberia emitir next'),
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/${tenantId}/cash`);
    req.flush({ message: 'already open' }, { status: 409, statusText: 'Conflict' });

    expect(capturedStatus).toBe(409);
  });
});
