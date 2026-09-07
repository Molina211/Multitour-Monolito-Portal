import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CreateTenantRequest, TenantApiService, TenantResponse } from './tenant-api.service';
import { environment } from '../../environments/environment';

describe('TenantApiService (contratos reales de creacion/ciclo de vida de tenant)', () => {
  let service: TenantApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TenantApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('create(): POST /tenants con administrator {email,password,passwordConfirmation} unicamente (sin firstName/lastName ni estado inicial)', () => {
    const request: CreateTenantRequest = {
      tenantId: 'nuevo-operador',
      commercialName: 'Nuevo Operador',
      actorId: 'platform-admin-1',
      administrator: { email: 'admin@nuevo.com', password: 'Multitour#2026', passwordConfirmation: 'Multitour#2026' },
    };

    service.create(request).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect((req.request.body.administrator as Record<string, unknown>)['firstName']).toBeUndefined();
    req.flush({} as TenantResponse);
  });

  it('listAll(): GET /tenants devuelve todos los tenants (vista de Platform Admin)', () => {
    let result: TenantResponse[] | undefined;
    service.listAll().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants`);
    expect(req.request.method).toBe('GET');
    const response = [{ tenantId: 't-1', tenantStatus: 'ACTIVO' } as TenantResponse];
    req.flush(response);

    expect(result).toEqual(response);
  });

  it('deactivate()/reactivate(): POST a la subruta real con reason/actorId', () => {
    service.deactivate('t-1', { reason: 'Cierre temporal', actorId: 'platform-admin-1' }).subscribe();
    const deactivateReq = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/t-1/deactivate`);
    expect(deactivateReq.request.method).toBe('POST');
    expect(deactivateReq.request.body).toEqual({ reason: 'Cierre temporal', actorId: 'platform-admin-1' });
    deactivateReq.flush({} as TenantResponse);

    service.reactivate('t-1', { reason: 'Reapertura', actorId: 'platform-admin-1' }).subscribe();
    const reactivateReq = httpMock.expectOne(`${environment.apiBaseUrl}/tenants/t-1/reactivate`);
    expect(reactivateReq.request.method).toBe('POST');
    reactivateReq.flush({} as TenantResponse);
  });

  it('create(): propaga un error 409 cuando el tenantId ya existe', () => {
    let capturedStatus: number | undefined;
    service.create({} as CreateTenantRequest).subscribe({
      next: () => fail('no deberia emitir next'),
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/tenants`);
    req.flush({ message: 'tenant already exists' }, { status: 409, statusText: 'Conflict' });

    expect(capturedStatus).toBe(409);
  });
});
